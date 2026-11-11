import { expect, test } from "@playwright/test";
import { answerQuestions, createReport } from "./helpers";

test("editing local answers creates a new report and retains the original snapshot", async ({ page }) => {
  test.setTimeout(120_000);
  const firstId = await createReport(page);
  const firstURL = page.url();
  const firstNames = await page.locator(".recommendation-card h2").allTextContents();
  await page.getByRole("link", { name: "修改偏好" }).click();
  await expect(page).toHaveURL(new RegExp(`/next-agent/quiz/\\?edit=${firstId}$`));
  await page.getByRole("button", { name: /^认真钻研/ }).click();
  await page.getByRole("button", { name: "进入情境" }).click();
  const secondId = await answerQuestions(page);
  expect(secondId).not.toBe(firstId);
  await page.goto(firstURL);
  await expect(page.locator(".recommendation-card h2")).toHaveText(firstNames);
  await page.reload();
  await expect(page.locator(".recommendation-card h2")).toHaveText(firstNames);
});

test("a copied report URL does not expose another browser's local data", async ({ page, browser }) => {
  const id = await createReport(page);
  const reportURL = page.url();
  const visitor = await browser.newContext();
  try {
    const other = await visitor.newPage();
    await other.goto(reportURL);
    await expect(other.getByRole("link", { name: /重新探索/ })).toBeVisible();
    await expect(other.locator(".recommendation-card")).toHaveCount(0);
    const tryout = new URL(reportURL);
    tryout.pathname = tryout.pathname.replace("/results/", "/tryout/");
    tryout.searchParams.set("id", id);
    await other.goto(tryout.href);
    await expect(other.getByRole("link", { name: /重新探索/ })).toBeVisible();
    await expect(other.getByRole("button", { name: "保存本局记录", exact: true })).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});

test("disabled browser storage reports failure instead of claiming a report was saved", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value() { throw new DOMException("Storage disabled for test", "SecurityError"); },
    });
  });
  await page.goto("quiz/");
  await page.getByRole("button", { name: "进入情境" }).click();
  const { questionnaire } = await import("./helpers");
  for (const [index, question] of questionnaire.questions.entries()) {
    await page.getByRole("button", { name: question.options[index % question.options.length].label }).click();
    await page.getByRole("button", {
      name: index === questionnaire.questions.length - 1 ? "生成我的报告" : "下一题",
      exact: true,
    }).click();
  }
  const storageAlert = page.locator("main").getByRole("alert");
  await expect(storageAlert).toBeVisible();
  await expect(storageAlert).toContainText("未能保存到此浏览器");
  await expect(page).toHaveURL(/\/next-agent\/quiz\/$/);
});
