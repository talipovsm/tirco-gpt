import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentDataMode } from "@/lib/db/data-mode";

/** S3-совместимое хранилище объектов. Файлы никогда не публикуются по открытым URL. */
export interface StorageAdapter {
  readonly driver: "local" | "s3";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Удаляет все объекты с префиксом (очистка демо-файлов). Возвращает число удалённых объектов, если известно. */
  deletePrefix(prefix: string): Promise<number | null>;
  /** Короткоживущая подписанная ссылка (для S3). null — отдавать через сервер. */
  signedUrl(key: string, filename: string, contentType: string, ttlSeconds?: number): Promise<string | null>;
}

class LocalStorageAdapter implements StorageAdapter {
  readonly driver = "local" as const;
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
  async deletePrefix(prefix: string) {
    await rm(this.resolve(prefix.replace(/\/+$/, "")), { recursive: true, force: true });
    return null;
  }
  async signedUrl() {
    return null;
  }
}

class S3StorageAdapter implements StorageAdapter {
  readonly driver = "s3" as const;
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;

  private async client() {
    this.clientPromise ??= import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          endpoint: process.env.S3_ENDPOINT || undefined,
          region: process.env.S3_REGION || "us-east-1",
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
          },
        }),
    );
    return this.clientPromise;
  }
  private get bucket() {
    return process.env.S3_BUCKET || "tirco";
  }
  async put(key: string, data: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }
  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await this.client()).send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async deletePrefix(prefix: string) {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    let token: string | undefined;
    let deleted = 0;
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }));
      const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (keys.length) {
        await client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }));
        deleted += keys.length;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return deleted;
  }
  async signedUrl(key: string, filename: string, contentType: string, ttlSeconds = 60) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    return getSignedUrl(
      await this.client(),
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: contentType,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: ttlSeconds },
    );
  }
}

const g = globalThis as unknown as { __cfStorage?: StorageAdapter };

export function storage(): StorageAdapter {
  if (g.__cfStorage) return g.__cfStorage;
  g.__cfStorage =
    process.env.STORAGE_DRIVER === "s3"
      ? new S3StorageAdapter()
      : new LocalStorageAdapter(path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_LOCAL_DIR || "./storage"));
  return g.__cfStorage;
}

/** Префикс загрузок пользователей демо-базы: их можно удалить целиком, не трогая файлы реальной базы (DATA-01). */
export const DEMO_UPLOADS_PREFIX = "demo/uploads/";

export function buildStorageKey(scope: string, ext: string) {
  const d = new Date();
  const mode = currentDataMode();
  return `${mode === "demo" ? DEMO_UPLOADS_PREFIX : ""}${scope}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}${ext}`;
}
