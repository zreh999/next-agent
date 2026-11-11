import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const basePath = "/next-agent";
const portFlag = process.argv.indexOf("--port");
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("请指定有效端口。");
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2"
};
const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/" || url.pathname === basePath) {
      response.writeHead(302, { Location: basePath + "/" + url.search }); response.end(); return;
    }
    if (!url.pathname.startsWith(basePath + "/")) {
      response.writeHead(404); response.end("Not found"); return;
    }
    const relative = decodeURIComponent(url.pathname.slice(basePath.length + 1));
    const target = path.resolve(root, relative);
    if (relative.includes("\0") || (target !== root && !target.startsWith(root + path.sep))) {
      response.writeHead(400); response.end("Invalid path"); return;
    }
    let filename = target;
    try {
      if ((await stat(filename)).isDirectory()) filename = path.join(filename, "index.html");
      const data = await readFile(filename);
      response.writeHead(200, {
        "Content-Type": types[path.extname(filename)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      const data = await readFile(path.join(root, "404.html"));
      response.end(request.method === "HEAD" ? undefined : data);
    }
  } catch {
    if (!response.headersSent) response.writeHead(500);
    response.end("Static preview failed");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log("静态预览：http://127.0.0.1:" + port + basePath + "/");
});

