import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import type { Questionnaire } from "../../src/lib/domain";

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(widths.content, "The 320px layout must fit without horizontal scrolling").toBeLessThanOrEqual(widths.viewport + 1);
}

test("mobile player can answer, read, export, share and save the first tryout", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 860 });

  const questionnaireResponse = await page.request.get("/api/questionnaire");
  expect(questionnaireResponse.status()).toBe(200);
  const questionnaire: Questionnaire = await questionnaireResponse.json();

  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "寻找我的本命" }).click();
  await expect(page).toHaveURL(/\/quiz$/);

  await page.getByRole("button", { name: /^已经玩过一些/ }).click();
  await page.getByRole("button", { name: /^适度练习/ }).click();
  await page.getByRole("button", { name: /^需要时交流/ }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "进入情境" }).click();

  for (const [index, question] of questionnaire.questions.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(question.prompt);
    const lastQuestion = index === questionnaire.questions.length - 1;
    const nextButton = page.getByRole("button", {
      name: lastQuestion ? "生成我的报告" : "下一题",
      exact: true,
    });
    await expect(nextButton).toBeDisabled();
    await page.getByRole("button", { name: question.options[index % question.options.length].label }).click();
    await expect(nextButton).toBeEnabled();
    await expectNoHorizontalOverflow(page);

    if (lastQuestion) {
      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith("/api/assessments") && response.request().method() === "POST",
      );
      await nextButton.click();
      expect((await responsePromise).status()).toBe(201);
    } else {
      await nextButton.click();
    }
  }

  await expect(page).toHaveURL(/\/results\/[^/?#]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/与你同频的，\s*不止一种可能。/);
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "玩法偏好与候选对比" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const assessmentId = new URL(page.url()).pathname.split("/").pop()!;

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载分享卡" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  expect(await download.failure()).toBeNull();
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const png = await readFile(downloadedPath!);
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBeGreaterThan(0);
  expect(png.readUInt32BE(20)).toBeGreaterThan(0);

  const shareResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith(`/api/assessments/${assessmentId}/shares`) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "创建分享链接", exact: true }).click();
  const shareResponse = await shareResponsePromise;
  expect(shareResponse.status()).toBe(201);
  const share: { id: string; path: string } = await shareResponse.json();
  await expect(page.getByRole("link", { name: "查看摘要" })).toHaveAttribute("href", share.path);
  await expect(page.getByRole("button", { name: "复制链接" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "带着任务去试玩" }).click();
  await expect(page).toHaveURL(new RegExp(`/tryout/${assessmentId}$`));
  const enjoyment = page.getByRole("slider", { name: "职责乐趣" });
  const burden = page.getByRole("slider", { name: "操作负担" });
  await enjoyment.press("End");
  await enjoyment.press("ArrowLeft");
  await burden.press("Home");
  await burden.press("ArrowRight");
  await expect(enjoyment).toHaveValue("4");
  await expect(burden).toHaveValue("2");

  const feedbackResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith(`/api/assessments/${assessmentId}/feedback`) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "保存本局记录", exact: true }).click();
  const feedbackResponse = await feedbackResponsePromise;
  expect(feedbackResponse.status()).toBe(201);
  const saved = await feedbackResponse.json();
  expect(saved.feedback).toMatchObject({ round: 1, enjoyment: 4, burden: 2 });
  await expect(page.getByRole("status").filter({ hasText: /第 1 局记录已保存/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("slider", { name: "职责乐趣" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const persistedResponse = await page.request.get(`/api/assessments/${assessmentId}`);
  expect(persistedResponse.status()).toBe(200);
  const persisted = await persistedResponse.json();
  expect(persisted.feedback).toContainEqual(expect.objectContaining({
    id: saved.feedback.id,
    round: 1,
    enjoyment: 4,
    burden: 2,
  }));
});
