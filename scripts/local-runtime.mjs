import { createServer } from "node:net";

/** Find a free local port without leaving a listening probe behind. */
export async function findAvailablePort(preferred = 3000, attempts = 20) {
  if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535) {
    throw new RangeError("Port must be an integer between 1 and 65535");
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("Port attempts must be a positive integer");
  }
  const last = Math.min(65535, preferred + attempts - 1);
  for (let port = preferred; port <= last; port++) {
    const available = await new Promise((resolve, reject) => {
      const server = createServer();
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" || error.code === "EACCES") resolve(false);
        else reject(error);
      });
      server.listen({ port }, () => {
        server.close((error) => (error ? reject(error) : resolve(true)));
      });
    });
    if (available) return port;
  }
  throw new Error(`No available port between ${preferred} and ${last}`);
}

/**
 * Update local HTTP URLs for this process, retaining explicit external configuration.
 * @param {string | undefined} appUrl
 * @param {number} port
 */
export function localAppUrl(appUrl, port) {
  if (!appUrl) return `http://localhost:${port}`;
  let url;
  try {
    url = new URL(appUrl);
  } catch {
    return appUrl;
  }
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return appUrl;
  url.port = String(port);
  const result = url.toString();
  return url.pathname === "/" && !url.search && !url.hash ? result.slice(0, -1) : result;
}
