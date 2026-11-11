import assert from "node:assert/strict";

// HTTP check of an already running static export. No application API is used.
const base = new URL(process.env.STATIC_BASE_URL ?? "http://127.0.0.1:3100/next-agent/");
let count = 0;
let home = "";
for (const path of ["./", "agents/", "quiz/", "method/", "results/?id=static-check", "tryout/?id=static-check"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `Static page failed: ${path}`);
  const body = await response.text();
  assert.match(body, /<html/);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  if (path === "./") home = body;
  count += 3;
}
const assets = [...new Set([...home.matchAll(/(?:src|href)="([^"]+\/_next\/[^"]+)"/g)].map(match => match[1]))];
assert.ok(assets.length > 0, "Expected generated JavaScript/CSS assets under the project base path");
count++;
for (const path of assets.slice(0, 8)) {
  const response = await fetch(new URL(path.replaceAll("&amp;", "&"), base));
  assert.equal(response.status, 200, `Static asset failed: ${path}`);
  count++;
}
console.log(`PASS static export: ${count} assertions; pages and generated assets respond under ${base.pathname}`);
