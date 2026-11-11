import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createReport, expectNoHorizontalOverflow } from "./helpers";

test("mobile player can answer, refresh, download and save local tryout feedback without an API", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 860 });
  const apiRequests: string[] = [];
  page.on("request", request => {
    if (/\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(request.url());
  });

  await page.goto("./");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "寻找我的本命" }).click();
  await expect(page).toHaveURL(/\/next-agent\/quiz\/$/);
  const id = await createReport(page, true);
  const reportURL = page.url();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "玩法偏好与候选对比" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const originalNames = await page.locator(".recommendation-card h2").allTextContents();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/与你同频的，\s*不止一种可能。/);
  await expect(page.locator(".recommendation-card h2")).toHaveText(originalNames);
  await expect(page.getByRole("button", { name: "创建分享链接", exact: true })).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载分享卡", exact: true }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const png = await readFile(path!);
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBeGreaterThan(0);
  expect(png.readUInt32BE(20)).toBeGreaterThan(0);

  await page.getByRole("link", { name: "带着任务去试玩" }).click();
  await expect(page).toHaveURL(new RegExp(`/next-agent/tryout/\\?id=${id}$`));
  const enjoyment = page.getByRole("slider", { name: /职责乐趣/ });
  const burden = page.getByRole("slider", { name: /操作负担/ });
  await enjoyment.press("End");
  await enjoyment.press("ArrowLeft");
  await burden.press("Home");
  await burden.press("ArrowRight");
  await expect(enjoyment).toHaveValue("4");
  await expect(burden).toHaveValue("2");
  const note = "静态回归：喜欢这个职责，愿意再试。";
  await page.getByRole("textbox", { name: /一句话感受/ }).fill(note);
  await page.getByRole("button", { name: "保存本局记录", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /第 1 局记录已保存/ })).toBeVisible();
  await page.reload();
  await expect(enjoyment).toHaveValue("4");
  await expect(burden).toHaveValue("2");
  await expect(page.getByRole("textbox", { name: /一句话感受/ })).toHaveValue(note);
  await expect(page.locator(".feedback-history").getByText(note, { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(reportURL);
  await expect(page.locator(".recommendation-card h2")).toHaveText(originalNames);
  await page.goto("results/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/与你同频的，\s*不止一种可能。/);
  expect(apiRequests).toEqual([]);
});
