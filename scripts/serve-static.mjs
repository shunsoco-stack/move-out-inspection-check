import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "out");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (pathname === "/" || pathname.startsWith("/inspections/"))
      target = resolve(root, "index.html");
    else if (!(await exists(target)) && !extname(target)) target += ".html";
    if (!(await exists(target))) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(target)] || "application/octet-stream",
    });
    response.end(await readFile(target));
  } catch {
    response.writeHead(400).end("Invalid request");
  }
});

server.listen(3108, "127.0.0.1", () => console.log("Static preview: http://127.0.0.1:3108"));
