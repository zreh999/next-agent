import assert from "node:assert/strict";
import { readFile, access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../out/", import.meta.url);
const files = ["index.html", "agents/index.html", "quiz/index.html", "results/index.html",
  "tryout/index.html", "method/index.html", "404.html"];
for (const file of files) {
  const html = await readFile(new URL(file, output), "utf8");
  assert.ok(html.includes("本命回响"), file + " 缺少项目内容");
  for (const match of html.matchAll(/(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
    assert.ok(match[1] === "/next-agent" || match[1].startsWith("/next-agent/"),
      file + " 中的站内资源缺少项目路径：" + match[1]);
  }
}
let hasApi = true;
try { await access(new URL("api/", output)); } catch { hasApi = false; }
assert.equal(hasApi, false, "静态发布目录不应包含后端API");
await writeFile(new URL(".nojekyll", output), "");
console.log("静态发布检查通过：" + files.length + " 个页面、项目路径及资源引用、无后端API。");
console.log("发布目录：" + fileURLToPath(output));

