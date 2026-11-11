import { expect, test } from "@playwright/test";
import catalog from "../../content/agents.json";
import { questionnaire, expectNoHorizontalOverflow } from "./helpers";

test("full roster can be browsed and filtered on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 860 });
  await page.goto("agents/");
  await expect(page.getByRole("article")).toHaveCount(catalog.agents.length);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/每个名字，\s*都有一种回响。/);
  await page.getByRole("button", { name: /^控场/ }).click();
  await expect(page.getByRole("article")).toHaveCount(catalog.agents.filter(agent => agent.role === "controller").length);
  await page.getByRole("button", { name: /^全部/ }).click();
  await page.getByRole("searchbox", { name: "搜索特工" }).fill("kayo");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("KAY/O");
  await page.getByRole("searchbox", { name: "搜索特工" }).fill("不存在的特工");
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "显示全部特工" }).click();
  await expect(page.getByRole("article")).toHaveCount(30);
  await expectNoHorizontalOverflow(page);
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(30);
});

test("a new questionnaire does not reuse an old version's draft", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("next-agent-draft-v1", JSON.stringify({
    version: "1.0.0", answers: { q01: "a", q02: "b" },
    preferences: { experience: "experienced", practice: "dedicated", communication: "active", excludedAgentIds: [] },
  })));
  await page.goto("quiz/");
  await page.getByRole("button", { name: "进入情境" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(questionnaire.questions[0].prompt);
  await expect(page.getByRole("button", { name: "下一题", exact: true })).toBeDisabled();
});

test("all top-level static pages open directly below the project base path", async ({ page }) => {
  for (const path of ["./", "agents/", "quiz/", "method/", "results/", "tryout/"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    expect(new URL(page.url()).pathname).toContain("/next-agent/");
  }
});
