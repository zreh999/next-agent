import { describe, expect, it } from "vitest";
import { createLocalStore, type LocalStorageAdapter } from "../src/lib/browser-storage";
import { catalog, questionnaire, ruleset } from "../src/lib/content";
import { calculateMatch } from "../src/lib/matching";
import type { AssessmentInput } from "../src/lib/domain";

class MemoryStorage implements LocalStorageAdapter {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;
  failLatest = false;
  getItem(key: string) {
    if (this.failReads) throw new Error("SecurityError");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites || (this.failLatest && key === "next-agent-last-result")) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

function input(): AssessmentInput {
  return {
    questionnaireVersion: questionnaire.version,
    answers: questionnaire.questions.map(question => ({ questionId: question.id, optionId: question.options[0].id })),
    preferences: { experience: "some", practice: "balanced", communication: "flexible", excludedAgentIds: [] },
  };
}
function setup(storage = new MemoryStorage()) {
  let sequence = 0;
  const environment = { now: () => new Date("2026-11-11T12:00:00.000Z"), randomId: () => `local-record-${String(++sequence).padStart(8, "0")}` };
  return { storage, store: createLocalStore(storage, environment), reopen: () => createLocalStore(storage) };
}

describe("browser-only reports and feedback", () => {
  it("persists the existing matching result and restores a snapshot in a fresh store instance", () => {
    const { storage, store, reopen } = setup();
    const answers = input();
    const record = store.createAssessment(answers);
    const expected = calculateMatch(answers, questionnaire, catalog, ruleset);
    expect(record.report.result).toEqual(expected);
    expect(record.report.agents.map(agent => agent.id).sort()).toEqual(expected.recommendations.map(candidate => candidate.agentId).sort());
    expect(record.report.dimensions).toEqual(questionnaire.dimensions);
    expect(reopen().getAssessment(record.id)).toEqual(record);
    expect(reopen().getLatestId()).toBe(record.id);
    expect(JSON.stringify([...storage.values.values()])).not.toContain("ownerHash");

    record.report.result.profile.intel = 0;
    record.input.answers[0].optionId = "modified-after-save";
    expect(reopen().getAssessment(record.id)?.report.result).toEqual(expected);
    expect(reopen().getAssessment(record.id)?.input).toEqual(answers);
  });

  it("keeps report history separate and never exposes one browser's records to another", () => {
    const { store, reopen } = setup();
    const first = store.createAssessment(input());
    const secondInput = input();
    secondInput.answers[0].optionId = questionnaire.questions[0].options[1].id;
    const second = store.createAssessment(secondInput);
    expect(reopen().getLatestId()).toBe(second.id);
    expect(reopen().getAssessment(first.id)).toEqual(first);
    expect(reopen().getAssessment(second.id)).toEqual(second);
    const otherBrowser = createLocalStore(new MemoryStorage());
    expect(otherBrowser.getAssessment(first.id)).toBeNull();
    expect(otherBrowser.getFeedback(first.id)).toEqual([]);
    expect(otherBrowser.getLatestId()).toBeNull();
  });

  it("upserts the same feedback slot while preserving other rounds and reports", () => {
    const { store, reopen } = setup();
    const first = store.createAssessment(input());
    const second = store.createAssessment(input());
    const feedback = { agentId: first.report.result.recommendations[0].agentId, round: 1, enjoyment: 4, burden: 2, wantsContinue: true, notes: "第一局" };
    const original = store.saveFeedback(first.id, feedback);
    store.saveFeedback(first.id, { ...feedback, round: 3, notes: "第三局" });
    store.saveFeedback(first.id, { ...feedback, round: 2, notes: "第二局" });
    const replacement = store.saveFeedback(first.id, { ...feedback, enjoyment: 5, notes: "更新第一局" });
    store.saveFeedback(second.id, { ...feedback, notes: "另一份报告" });
    expect(replacement.id).toBe(original.id);
    expect(reopen().getFeedback(first.id).map(record => record.round)).toEqual([1, 2, 3]);
    expect(reopen().getFeedback(first.id)[0]).toMatchObject({ enjoyment: 5, notes: "更新第一局", assessmentId: first.id });
    expect(reopen().getFeedback(second.id)).toHaveLength(1);
    expect(reopen().getFeedback(second.id)[0].notes).toBe("另一份报告");
  });

  it("rejects incomplete answers, unrelated agents and invalid feedback without saving them", () => {
    const { store } = setup();
    const incomplete = input();
    incomplete.answers.pop();
    expect(() => store.createAssessment(incomplete)).toThrow("请完整回答所有题目");
    expect(store.getLatestId()).toBeNull();
    const record = store.createAssessment(input());
    const agentId = record.report.result.recommendations[0].agentId;
    const feedback = { agentId, round: 1, enjoyment: 4, burden: 2, wantsContinue: true, notes: "" };
    const unrelated = catalog.agents.find(agent => !record.report.result.recommendations.some(recommendation => recommendation.agentId === agent.id))!;
    expect(() => store.saveFeedback(record.id, { ...feedback, agentId: unrelated.id })).toThrow("只能记录这份报告推荐的特工");
    for (const invalid of [{ ...feedback, round: 4 }, { ...feedback, enjoyment: 0 }, { ...feedback, notes: "字".repeat(501) }]) {
      expect(() => store.saveFeedback(record.id, invalid)).toThrow("试玩记录格式有误");
    }
    expect(() => store.saveFeedback("missing-report", feedback)).toThrow("此浏览器中没有这份报告");
    expect(store.getFeedback(record.id)).toEqual([]);
  });

  it("reports blocked storage and failed writes rather than announcing a saved result", () => {
    const { storage, store } = setup();
    storage.failReads = true;
    expect(() => store.getLatestId()).toThrow("无法读取本机记录");
    storage.failReads = false;
    storage.failWrites = true;
    expect(() => store.createAssessment(input())).toThrow("未能保存到此浏览器");
    expect(storage.values.size).toBe(0);
    storage.failWrites = false;
    storage.failLatest = true;
    expect(() => store.createAssessment(input())).toThrow("未能保存到此浏览器");
    expect(storage.values.size).toBe(0);
  });

  it("preserves the last persisted feedback when a later write fails", () => {
    const { storage, store, reopen } = setup();
    const record = store.createAssessment(input());
    const feedback = { agentId: record.report.result.recommendations[0].agentId, round: 1, enjoyment: 4, burden: 2, wantsContinue: true, notes: "已保存" };
    store.saveFeedback(record.id, feedback);
    storage.failWrites = true;
    expect(() => store.saveFeedback(record.id, { ...feedback, notes: "未保存" })).toThrow("未能保存到此浏览器");
    expect(reopen().getFeedback(record.id)[0].notes).toBe("已保存");
  });

  it("does not silently replace corrupt report or feedback data", () => {
    const { storage, store } = setup();
    const record = store.createAssessment(input());
    const reportKey = [...storage.values.keys()].find(key => key.includes(":assessment:"))!;
    const raw = storage.values.get(reportKey)!;
    storage.values.set(reportKey, "{broken");
    expect(() => store.getAssessment(record.id)).toThrow("本机报告已损坏");
    expect(storage.values.get(reportKey)).toBe("{broken");
    storage.values.set(reportKey, raw);
    const feedback = { agentId: record.report.result.recommendations[0].agentId, round: 1, enjoyment: 4, burden: 2, wantsContinue: true };
    store.saveFeedback(record.id, feedback);
    const feedbackKey = [...storage.values.keys()].find(key => key.includes(":feedback:"))!;
    storage.values.set(feedbackKey, JSON.stringify([{ ...feedback, assessmentId: "another-report" }]));
    expect(() => store.getFeedback(record.id)).toThrow("本机试玩记录已损坏");
    expect(() => store.saveFeedback(record.id, feedback)).toThrow("本机试玩记录已损坏");
  });

  it("loads a saved content-version snapshot without recomputing it with the current rules", () => {
    const { storage, store, reopen } = setup();
    const record = store.createAssessment(input());
    const key = [...storage.values.keys()].find(item => item.includes(":assessment:"))!;
    const snapshot = JSON.parse(storage.values.get(key)!);
    snapshot.report.result.versions.ruleset = "previous-rule-snapshot";
    snapshot.report.result.recommendations[0].tradeoff = "保存当时的取舍说明";
    storage.values.set(key, JSON.stringify(snapshot));
    expect(reopen().getAssessment(record.id)?.report.result.versions.ruleset).toBe("previous-rule-snapshot");
    expect(reopen().getAssessment(record.id)?.report.result.recommendations[0].tradeoff).toBe("保存当时的取舍说明");
  });
});
