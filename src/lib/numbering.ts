import "server-only";
import type { Tx } from "@/lib/db/prisma";
import { PUBLIC_NUMBER_PREFIX } from "@/lib/public-number";

const SEQ = {
  load: { seq: "load_number_seq", prefix: PUBLIC_NUMBER_PREFIX.load },
  order: { seq: "order_number_seq", prefix: PUBLIC_NUMBER_PREFIX.order },
  contract: { seq: "contract_number_seq", prefix: PUBLIC_NUMBER_PREFIX.contract },
} as const;

/** Человекочитаемый номер из последовательности PostgreSQL: TR-L-000001, TR-O-000001, TR-C-000001 (BL-02). */
export async function nextPublicNumber(tx: Tx, kind: keyof typeof SEQ): Promise<string> {
  const { seq, prefix } = SEQ[kind];
  const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT nextval('"${seq}"') AS n`);
  return `${prefix}${String(Number(rows[0].n)).padStart(6, "0")}`;
}
