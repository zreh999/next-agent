import { describe, expect, it } from "vitest";
import { catalog, questionnaire, ruleset, validateContent } from "../src/lib/content";
import { dimensionIds, type AgentRole, type DimensionId } from "../src/lib/domain";

const sortedDimensions = [...dimensionIds].sort();
const roles: AgentRole[] = ["duelist", "initiator", "controller", "sentinel"];
// Dated roster snapshot, not a permanent claim about the latest game roster.
const expectedRosterReviewedAt = "2026-11-11";
const expectedAgentSlugs = [
  "astra", "breach", "brimstone", "chamber", "clove", "cypher", "deadlock", "fade",
  "gekko", "harbor", "hush", "iso", "jett", "kayo", "killjoy", "miks", "neon", "omen",
  "phoenix", "raze", "reyna", "sage", "skye", "sova", "tejo", "veto", "viper", "vyse", "waylay", "yoru",
].sort();
const canonicalAgentSlug = (slug: string) => slug.toLowerCase().replace(/-/g, "");

describe("published content audit", () => {
  it("loads the complete versioned launch catalog through the production validator", () => {
    expect(validateContent()).toBe(true);
    expect(questionnaire.version).toBe("3.0.0");
    expect(catalog.version).toBe("2.0.0");
    expect(questionnaire.questions).toHaveLength(16);
    expect(questionnaire.questions.flatMap((question) => question.options)).toHaveLength(64);
    expect(catalog.agents).toHaveLength(30);
    expect(questionnaire.dimensions.map((dimension) => dimension.id).sort()).toEqual(sortedDimensions);

    for (const version of [questionnaire.version, catalog.version, ruleset.version]) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it(`covers every official agent in the ${expectedRosterReviewedAt} roster snapshot exactly once`, () => {
    const sourceSlugs = catalog.agents.map((agent) => {
      const source = new URL(agent.sourceUrl);
      const match = source.pathname.match(/^\/en-us\/agents\/([^/]+)\/$/);
      expect(match, agent.id).not.toBeNull();
      return canonicalAgentSlug(match![1]);
    });
    expect(sourceSlugs.sort()).toEqual(expectedAgentSlugs);
    expect(catalog.agents.map((agent) => canonicalAgentSlug(agent.id)).sort()).toEqual(expectedAgentSlugs);
    expect(new Set(sourceSlugs).size).toBe(30);
  });

  it("keeps IDs unique in every scope used by answers, reports, and recommendations", () => {
    expect(new Set(questionnaire.questions.map((question) => question.id)).size).toBe(questionnaire.questions.length);
    expect(new Set(catalog.agents.map((agent) => agent.id)).size).toBe(catalog.agents.length);
    expect(new Set(questionnaire.dimensions.map((dimension) => dimension.id)).size).toBe(dimensionIds.length);

    for (const question of questionnaire.questions) {
      expect(question.options, question.id).toHaveLength(4);
      expect(new Set(question.options.map((option) => option.id)).size, question.id).toBe(question.options.length);
    }
  });

  it("offers comparable but distinct scoring choices within each question", () => {
    for (const question of questionnaire.questions) {
      const covered = Object.keys(question.options[0].scores).sort() as DimensionId[];
      expect(covered.length, question.id).toBeGreaterThan(0);
      expect(covered.every((dimension) => dimensionIds.includes(dimension)), question.id).toBe(true);

      const vectors = question.options.map((option) => {
        expect(Object.keys(option.scores).sort(), `${question.id}/${option.id}`).toEqual(covered);
        return covered.map((dimension) => option.scores[dimension]).join(",");
      });
      expect(new Set(vectors).size, question.id).toBe(question.options.length);
    }
  });

  it("uses only finite integer answer scores in the documented 0–4 range", () => {
    for (const question of questionnaire.questions) {
      for (const option of question.options) {
        for (const [dimension, score] of Object.entries(option.scores)) {
          const location = `${question.id}/${option.id}/${dimension}`;
          expect(Number.isInteger(score), location).toBe(true);
          expect(score, location).toBeGreaterThanOrEqual(0);
          expect(score, location).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("gives every dimension at least six questions that can actually change its score", () => {
    for (const dimension of dimensionIds) {
      const informativeQuestions = questionnaire.questions.filter((question) => {
        const scores = question.options.map((option) => option.scores[dimension]);
        return scores.every((score) => score !== undefined) && new Set(scores).size > 1;
      });
      expect(informativeQuestions.length, dimension).toBeGreaterThanOrEqual(6);
    }
  });

  it("covers all four roles and provides complete normalized profiles without assuming equal role counts", () => {
    for (const role of roles) {
      expect(catalog.agents.filter((agent) => agent.role === role).length, role).toBeGreaterThan(0);
    }

    for (const agent of catalog.agents) {
      expect(Object.keys(agent.profile).sort(), agent.id).toEqual(sortedDimensions);
      for (const dimension of dimensionIds) {
        const value = agent.profile[dimension];
        expect(Number.isFinite(value), `${agent.id}/${dimension}`).toBe(true);
        expect(value, `${agent.id}/${dimension}`).toBeGreaterThanOrEqual(0);
        expect(value, `${agent.id}/${dimension}`).toBeLessThanOrEqual(1);
      }
      expect([1, 2, 3], `${agent.id}/practice`).toContain(agent.practiceLoad);
      expect([1, 2, 3], `${agent.id}/communication`).toContain(agent.communicationLoad);
    }
  });

  it("makes every candidate traceable to an official profile and a dated review", () => {
    for (const agent of catalog.agents) {
      const source = new URL(agent.sourceUrl);
      expect(source.protocol, agent.id).toBe("https:");
      expect(source.hostname, agent.id).toBe("playvalorant.com");
      const sourceSlug = source.pathname.match(/^\/en-us\/agents\/([^/]+)\/$/)?.[1];
      expect(sourceSlug, agent.id).toBeDefined();
      expect(canonicalAgentSlug(sourceSlug!), agent.id).toBe(canonicalAgentSlug(agent.id));
      expect(source.search, agent.id).toBe("");
      expect(agent.reviewedAt, agent.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${agent.reviewedAt}T00:00:00Z`).toISOString().slice(0, 10), agent.id).toBe(agent.reviewedAt);
    }
  });

  it("ships three distinct usable tryout tasks and an explicit tradeoff for every candidate", () => {
    for (const agent of catalog.agents) {
      expect(agent.tryoutTasks, agent.id).toHaveLength(3);
      const tasks = agent.tryoutTasks.map((task) => task.trim());
      expect(tasks.every((task) => task.length > 0), agent.id).toBe(true);
      expect(new Set(tasks).size, agent.id).toBe(3);
      expect(agent.tradeoff.trim().length, agent.id).toBeGreaterThan(0);
    }
  });

  it("keeps public matching parameters finite and inside their normalized ranges", () => {
    expect(Object.keys(ruleset.dimensionWeights).sort()).toEqual(sortedDimensions);
    for (const dimension of dimensionIds) {
      expect(Number.isFinite(ruleset.dimensionWeights[dimension]), dimension).toBe(true);
      expect(ruleset.dimensionWeights[dimension], dimension).toBeGreaterThan(0);
    }
    for (const parameter of [ruleset.practicePenalty, ruleset.communicationPenalty, ruleset.alternativeTolerance]) {
      expect(Number.isFinite(parameter)).toBe(true);
      expect(parameter).toBeGreaterThanOrEqual(0);
      expect(parameter).toBeLessThanOrEqual(1);
    }
  });
});
