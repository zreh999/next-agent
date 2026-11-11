import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createReport, expectNoHorizontalOverflow } from "./helpers";

test("illustrated quotes export a portrait PNG and still export when the image host fails", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 860 });
  let offline = false;
  await page.route("https://media.valorant-api.com/**", route => offline ? route.abort() : route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="640"><rect x="50" y="40" width="140" height="560" rx="50" fill="#a5e9d8"/></svg>',
  }));
  await createReport(page);
  const card = page.getByRole("region", { name: "艺术分享卡", exact: true });
  await expect(card).toBeVisible();
  await card.locator(".art-poster").scrollIntoViewIfNeeded();
  await expect(card.getByText("角色台词｜中文译意", { exact: true })).toBeVisible();
  await expect(card.getByRole("img").first()).toBeVisible();
  const impression = await card.locator(".art-poster-title > p").boundingBox();
  const quote = await card.locator(".art-poster-quote").boundingBox();
  expect(impression).not.toBeNull();
  expect(quote).not.toBeNull();
  expect(quote!.y).toBeGreaterThanOrEqual(impression!.y + impression!.height);
  await expect(card.locator("audio, input[type=file]")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  async function downloadPoster() {
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载分享卡", exact: true }).click();
    const download = await event;
    expect(await download.failure()).toBeNull();
    const filename = await download.path();
    expect(filename).not.toBeNull();
    const png = await readFile(filename!);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1440);
  }
  await downloadPoster();
  await expect(page.locator("main").getByRole("status").filter({ hasText: "立绘海报已生成" })).toBeVisible();

  offline = true;
  await page.reload();
  await card.locator(".art-poster").scrollIntoViewIfNeeded();
  await expect(card.locator(".art-poster-hero .agent-glyph")).toBeVisible();
  await downloadPoster();
  await expect(page.locator("main").getByRole("status").filter({ hasText: /几何/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
