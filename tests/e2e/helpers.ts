import { expect, type Page } from "@playwright/test";
import questionnaire from "../../content/questionnaire.json";

export { questionnaire };

export async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(widths.content, "The 320px layout must fit without horizontal scrolling").toBeLessThanOrEqual(widths.viewport + 1);
}

export async function answerQuestions(page: Page, checkLayout = false) {
  for (const [index, question] of questionnaire.questions.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(question.prompt);
    const next = page.getByRole("button", {
      name: index === questionnaire.questions.length - 1 ? "生成我的报告" : "下一题",
      exact: true,
    });
    await page.getByRole("button", { name: question.options[index % question.options.length].label }).click();
    await expect(next).toBeEnabled();
    if (checkLayout) await expectNoHorizontalOverflow(page);
    await next.click();
  }
  await expect(page).toHaveURL(/\/next-agent\/results\/\?id=[^&]+/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/与你同频的，\s*不止一种可能。/);
  const id = new URL(page.url()).searchParams.get("id");
  expect(id).toBeTruthy();
  return id!;
}

export async function createReport(page: Page, checkLayout = false) {
  await page.goto("quiz/");
  await page.getByRole("button", { name: /^已经玩过一些/ }).click();
  await page.getByRole("button", { name: "进入情境" }).click();
  return answerQuestions(page, checkLayout);
}
