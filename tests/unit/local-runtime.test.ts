import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { findAvailablePort, localAppUrl } from "../../scripts/local-runtime.mjs";

const servers: Server[] = [];

async function occupy(port = 0) {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ port }, resolve);
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return address.port;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))),
  );
});

describe("local port selection", () => {
  it("skips an occupied dual-stack port and releases the selected port", async () => {
    const busy = await occupy();
    const selected = await findAvailablePort(busy);
    expect(selected).toBeGreaterThan(busy);
    expect(selected).toBeLessThanOrEqual(Math.min(65535, busy + 19));
    expect(await occupy(selected)).toBe(selected);
  });

  it("reuses an available preferred port", async () => {
    const port = await findAvailablePort(31000, 200);
    expect(await findAvailablePort(port, 1)).toBe(port);
  });

  it("stops after the requested number of attempts", async () => {
    const busy = await occupy();
    await expect(findAvailablePort(busy, 1)).rejects.toThrow(`No available port between ${busy} and ${busy}`);
  });

  it.each([0, -1, 65536, 3000.5, NaN, Infinity])("rejects invalid preferred port %s", async (port) => {
    await expect(findAvailablePort(port)).rejects.toThrow(RangeError);
  });

  it.each([0, -1, 1.5, NaN, Infinity])("rejects invalid attempt count %s", async (attempts) => {
    await expect(findAvailablePort(3000, attempts)).rejects.toThrow(RangeError);
  });

  it("does not probe beyond the highest valid TCP port", async () => {
    try {
      expect(await findAvailablePort(65535, 20)).toBe(65535);
    } catch (error) {
      expect((error as Error).message).toBe("No available port between 65535 and 65535");
    }
  });
});

describe("local APP_URL", () => {
  it("defaults to localhost at the selected port", () => {
    expect(localAppUrl(undefined, 3001)).toBe("http://localhost:3001");
    expect(localAppUrl("", 3001)).toBe("http://localhost:3001");
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("replaces the port for HTTP %s", (host) => {
    expect(localAppUrl(`http://${host}:3000`, 3002)).toBe(`http://${host}:3002`);
  });

  it("retains local paths, queries, and fragments", () => {
    expect(localAppUrl("http://localhost:3000/tirco/?mode=demo#loads", 3002)).toBe("http://localhost:3002/tirco/?mode=demo#loads");
  });

  it.each(["https://tirco.example", "http://tirco.example:3000", "https://localhost:3000", "not-a-url"])(
    "preserves explicit URL %s",
    (url) => {
      expect(localAppUrl(url, 3002)).toBe(url);
    },
  );
});
