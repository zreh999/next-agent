import { describe, expect, it } from "vitest";
import { calculateMatch } from "../src/lib/matching";
import type {
  AgentCatalog,
  AgentProfile,
  AssessmentInput,
  DimensionId,
  Questionnaire,
  Ruleset,
} from "../src/lib/domain";

const dimensionIds: DimensionId[] = ["initiative", "intel", "setup", "adaptability", "teamwork"];

function makeAgent(id: string, role: AgentProfile["role"], initiative: number, intel: number): AgentProfile {
  return {
    id, role, name: id, enName: id,
    tagline: "测试候选", description: "人工小样本，不依赖实际特工资料。",
    profile: { initiative, intel, setup: 0.5, adaptability: 0.5, teamwork: 0.5 },
    practiceLoad: 1, communicationLoad: 1,
    strengths: ["测试优势"], tradeoff: "测试取舍", tryoutTasks: ["试用一次"],
    sourceUrl: "https://example.com/agent", reviewedAt: "2026-11-10",
  };
}

function fixture(): { input: AssessmentInput; questionnaire: Questionnaire; catalog: AgentCatalog; rules: Ruleset } {
  return {
    questionnaire: {
      version: "questions-test-v1",
      dimensions: dimensionIds.map((id) => ({ id, label: id, lowLabel: `${id}-low`, highLabel: `${id}-high`, description: "测试维度" })),
      questions: [
        { id: "opening", prompt: "怎样开局？", options: [
          { id: "observe", label: "先观察", scores: { initiative: 0 } },
          { id: "lead", label: "先创造机会", scores: { initiative: 4 } },
        ] },
        { id: "information", prompt: "怎样做决定？", options: [
          { id: "gather", label: "先收集信息", scores: { intel: 4 } },
          { id: "act", label: "先行动", scores: { intel: 0 } },
        ] },
      ],
    },
    catalog: { version: "agents-test-v1", agents: [
      makeAgent("a-best", "initiator", 0, 1),
      makeAgent("b-same-role", "initiator", 0, 1),
      makeAgent("c-alternative", "controller", 0.1, 0.9),
      makeAgent("d-explore", "sentinel", 0.3, 0.7),
    ] },
    rules: { version: "rules-test-v1", dimensionWeights: { initiative: 1, intel: 1, setup: 1, adaptability: 1, teamwork: 1 },
      practicePenalty: 0.08, communicationPenalty: 0.06, alternativeTolerance: 0.2 },
    input: { questionnaireVersion: "questions-test-v1", answers: [
      { questionId: "opening", optionId: "observe" },
      { questionId: "information", optionId: "gather" },
    ], preferences: { experience: "some", practice: "balanced", communication: "flexible", excludedAgentIds: [] } },
  };
}

function run(data = fixture()) {
  return calculateMatch(data.input, data.questionnaire, data.catalog, data.rules);
}

describe("calculateMatch", () => {
  it("reproduces results for the same versions regardless of answer or catalog order", () => {
    const data = fixture();
    const first = run(data);
    data.input.answers.reverse();
    data.catalog.agents.reverse();
    expect(run(data)).toEqual(first);
    expect(first.versions).toEqual({ questionnaire: "questions-test-v1", ruleset: "rules-test-v1", agents: "agents-test-v1" });
    expect(first.coverageCount).toBe(4);
    expect(first.recommendations.map((item) => [item.kind, item.agentId])).toEqual([
      ["best", "a-best"], ["alternative", "c-alternative"], ["explore", "d-explore"],
    ]);
  });

  it("normalizes answered dimensions and ignores uncovered axes in distance", () => {
    const data = fixture();
    data.catalog.agents[0].profile.setup = 0;
    data.catalog.agents[0].profile.adaptability = 1;
    const result = run(data);
    expect(result.profile).toEqual({ initiative: 0, intel: 1, setup: 0.5, adaptability: 0.5, teamwork: 0.5 });
    expect(result.recommendations[0].fitScore).toBe(100);
    expect(result.recommendations[0].scoreBreakdown.distance).toBe(0);
  });

  it("uses dimension weights when comparing contrasting preferences", () => {
    const data = fixture();
    data.catalog.agents = [makeAgent("initiative-fit", "duelist", 0, 0), makeAgent("intel-fit", "initiator", 1, 1)];
    data.rules.dimensionWeights.initiative = 3;
    expect(run(data).recommendations[0].agentId).toBe("initiative-fit");
    data.rules.dimensionWeights.intel = 5;
    expect(run(data).recommendations[0].agentId).toBe("intel-fit");
  });

  it("makes practice and communication penalties visible without treating experience as personality", () => {
    const data = fixture();
    data.catalog.agents = [makeAgent("only", "controller", 0, 1)];
    data.catalog.agents[0].practiceLoad = 3;
    data.catalog.agents[0].communicationLoad = 2;
    data.input.preferences.practice = "light";
    data.input.preferences.communication = "quiet";
    const result = run(data);
    expect(result.recommendations[0].scoreBreakdown).toEqual({ distance: 0, practicePenalty: 0.16, communicationPenalty: 0.06 });
    expect(result.recommendations[0].fitScore).toBe(78);
    data.input.preferences.experience = "new";
    expect(run(data)).toEqual(result);
    data.input.preferences.experience = "experienced";
    expect(run(data)).toEqual(result);
  });

  it("traces reasons only to submitted answers that actually cover the dimension", () => {
    const result = run();
    for (const recommendation of result.recommendations) {
      expect(recommendation.reasons).toHaveLength(2);
      for (const reason of recommendation.reasons) {
        expect(["initiative", "intel"]).toContain(reason.dimension);
        expect(reason.questionIds).toEqual(reason.dimension === "initiative" ? ["opening"] : ["information"]);
        expect(reason.text).toContain(reason.dimension === "initiative" ? "先观察" : "先收集信息");
        expect(reason.text).not.toContain("先创造机会");
      }
    }
  });

  it("filters exclusions and never repeats a candidate", () => {
    const data = fixture();
    data.input.preferences.excludedAgentIds = ["a-best"];
    const result = run(data);
    const ids = result.recommendations.map((item) => item.agentId);
    expect(ids).not.toContain("a-best");
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.recommendations[0].agentId).toBe("b-same-role");
    expect(result.coverageCount).toBe(4);
  });

  it("returns one or two recommendations instead of inventing candidates", () => {
    const data = fixture();
    data.input.preferences.excludedAgentIds = ["b-same-role", "c-alternative", "d-explore"];
    expect(run(data).recommendations.map((item) => item.kind)).toEqual(["best"]);
    data.input.preferences.excludedAgentIds = ["c-alternative", "d-explore"];
    expect(run(data).recommendations.map((item) => item.kind)).toEqual(["best", "alternative"]);
  });

  it("does not fill exploration with a candidate exceeding the stated load preferences", () => {
    const data = fixture();
    data.input.preferences.practice = "light";
    data.catalog.agents[1].practiceLoad = 2;
    data.catalog.agents[3].practiceLoad = 3;
    const result = run(data);
    expect(result.recommendations.map((item) => item.kind)).toEqual(["best", "alternative"]);
  });

  it("only prioritizes a different role for the alternative inside the public tolerance", () => {
    const data = fixture();
    data.rules.alternativeTolerance = 0.05;
    expect(run(data).recommendations[1].agentId).toBe("b-same-role");
    data.rules.alternativeTolerance = 0.1;
    expect(run(data).recommendations[1].agentId).toBe("c-alternative");
  });

  it("rejects a stale questionnaire, missing answers, duplicate answers, and invalid answers", () => {
    const data = fixture();
    expect(() => run({ ...data, input: { ...data.input, questionnaireVersion: "old" } })).toThrow(/版本/);
    expect(() => run({ ...data, input: { ...data.input, answers: data.input.answers.slice(0, 1) } })).toThrow(/完整/);
    expect(() => run({ ...data, input: { ...data.input, answers: [data.input.answers[0], data.input.answers[0]] } })).toThrow(/重复/);
    expect(() => run({ ...data, input: { ...data.input, answers: [data.input.answers[0], { questionId: "unknown", optionId: "gather" }] } })).toThrow(/未知题目/);
    expect(() => run({ ...data, input: { ...data.input, answers: [data.input.answers[0], { questionId: "information", optionId: "unknown" }] } })).toThrow(/无效选项/);
  });

  it("rejects unknown exclusions and an empty candidate pool", () => {
    const data = fixture();
    data.input.preferences.excludedAgentIds = ["missing"];
    expect(() => run(data)).toThrow(/未知特工/);
    data.input.preferences.excludedAgentIds = data.catalog.agents.map((agent) => agent.id);
    expect(() => run(data)).toThrow(/没有可推荐/);
  });

  it("rejects malformed content and a ruleset with no usable dimensions", () => {
    const data = fixture();
    data.questionnaire.questions[0].options[0].scores.initiative = Number.NaN;
    expect(() => run(data)).toThrow(/0 到 4/);
    const noCoverage = fixture();
    noCoverage.rules.dimensionWeights.initiative = 0;
    noCoverage.rules.dimensionWeights.intel = 0;
    expect(() => run(noCoverage)).toThrow(/有效维度/);
  });
});
