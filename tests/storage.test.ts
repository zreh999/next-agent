import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { AssessmentRecord, FeedbackRecord, ShareRecord } from "../src/lib/domain";
import {
  getAssessment,
  getFeedback,
  getShare,
  listShares,
  revokeShare,
  saveAssessment,
  saveFeedback,
  saveShare,
} from "../src/lib/server/storage";

let directory: string;
const temporaryPrefix = "next-agent-storage-test-";

function assessment(id = "assessment-1"): AssessmentRecord {
  return {
    id,
    ownerHash: "test-owner-hash",
    input: {
      questionnaireVersion: "questions-snapshot-v1",
      answers: [{ questionId: "opening", optionId: "observe" }],
      preferences: { experience: "some", practice: "balanced", communication: "flexible", excludedAgentIds: [] },
    },
    report: {
      createdAt: "2026-11-10T12:00:00.000Z",
      agents: [],
      dimensions: [],
      result: {
        profile: { initiative: 0, intel: 1, setup: 0.5, adaptability: 0.5, teamwork: 0.5 },
        recommendations: [],
        versions: { questionnaire: "questions-snapshot-v1", ruleset: "rules-snapshot-v1", agents: "agents-snapshot-v1" },
        coverageCount: 12,
      },
    },
  };
}

function feedback(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "feedback-1", assessmentId: "assessment-1", agentId: "test-agent", round: 1,
    enjoyment: 4, burden: 2, wantsContinue: true, notes: "第一次记录",
    createdAt: "2026-11-10T13:00:00.000Z",
    ...overrides,
  };
}

function share(id = "public-share-1", createdAt = "2026-11-10T14:00:00.000Z"): ShareRecord {
  return { id, assessmentId: "assessment-1", snapshot: assessment().report, createdAt, revokedAt: null };
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), temporaryPrefix));
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("NEXT_AGENT_DATA_DIR", directory);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  // Delete only the exact temporary directory created for this test.
  const target = path.resolve(directory);
  if (path.dirname(target) !== path.resolve(tmpdir()) || !path.basename(target).startsWith(temporaryPrefix)) {
    throw new Error("Refusing to clean a path outside this test's temporary directory.");
  }
  await rm(target, { recursive: true, force: true });
});

describe("file storage", () => {
  it("persists complete private records and returns null for a missing assessment", async () => {
    expect(await getAssessment("missing")).toBeNull();
    const original = assessment();
    await saveAssessment(original);

    const persisted = JSON.parse(await readFile(path.join(directory, "store.json"), "utf8"));
    expect(persisted.assessments).toEqual([original]);
    expect(await getAssessment(original.id)).toEqual(original);
    expect(persisted.feedback).toEqual([]);
    expect(persisted.shares).toEqual([]);
  });

  it("serializes concurrent writes without losing records or corrupting JSON", async () => {
    const records = Array.from({ length: 20 }, (_, index) => assessment(`assessment-${index}`));
    await Promise.all(records.map((record) => saveAssessment(record)));
    const restored = await Promise.all(records.map((record) => getAssessment(record.id)));
    expect(restored).toEqual(records);

    const persisted = JSON.parse(await readFile(path.join(directory, "store.json"), "utf8"));
    expect(persisted.assessments).toHaveLength(records.length);
    expect(new Set(persisted.assessments.map((record: AssessmentRecord) => record.id)).size).toBe(records.length);
  });

  it("upserts a feedback slot without overwriting another agent, round, or assessment", async () => {
    await Promise.all([saveAssessment(assessment()), saveAssessment(assessment("assessment-2"))]);
    await saveFeedback(feedback());
    await saveFeedback(feedback({ id: "feedback-round-2", round: 2, notes: "另一局" }));
    await saveFeedback(feedback({ id: "feedback-other-agent", agentId: "other-agent", notes: "另一特工" }));
    await saveFeedback(feedback({ id: "feedback-other-assessment", assessmentId: "assessment-2" }));
    await saveFeedback(feedback({ id: "feedback-updated", enjoyment: 2, notes: "更新后的记录" }));

    const records = await getFeedback("assessment-1");
    expect(records).toHaveLength(3);
    expect(records.find((record) => record.agentId === "test-agent" && record.round === 1))
      .toMatchObject({ id: "feedback-updated", enjoyment: 2, notes: "更新后的记录" });
    expect(records.find((record) => record.round === 2)?.notes).toBe("另一局");
    expect(records.find((record) => record.agentId === "other-agent")?.notes).toBe("另一特工");
    expect(await getFeedback("assessment-2")).toHaveLength(1);
  });

  it("keeps only one slot when the same feedback key is written concurrently", async () => {
    await saveAssessment(assessment());
    await Promise.all(Array.from({ length: 12 }, (_, index) => saveFeedback(feedback({
      id: `feedback-${index}`, notes: `记录-${index}`,
    }))));
    const records = await getFeedback("assessment-1");
    expect(records).toHaveLength(1);
    expect(records[0].notes).toBe("记录-11");
  });

  it("returns feedback in round order just like the PostgreSQL path", async () => {
    await saveAssessment(assessment());
    await saveFeedback(feedback({ id: "round-3", round: 3 }));
    await saveFeedback(feedback({ id: "round-1", round: 1 }));
    await saveFeedback(feedback({ id: "round-2", round: 2 }));
    expect((await getFeedback("assessment-1")).map((record) => record.round)).toEqual([1, 2, 3]);
  });

  it("preserves version snapshots independently of later in-memory edits", async () => {
    const original = assessment();
    await saveAssessment(original);
    await saveShare({ ...share(), snapshot: original.report });

    original.input.answers[0].optionId = "changed";
    original.report.result.versions.agents = "new-agent-data";
    original.report.result.profile.intel = 0;

    const storedAssessment = await getAssessment(original.id);
    const storedShare = await getShare("public-share-1");
    expect(storedAssessment?.input.answers[0].optionId).toBe("observe");
    expect(storedAssessment?.report.result.versions.agents).toBe("agents-snapshot-v1");
    expect(storedShare?.snapshot.result.versions.agents).toBe("agents-snapshot-v1");
    expect(storedShare?.snapshot.result.profile.intel).toBe(1);
    expect(storedShare?.snapshot).not.toHaveProperty("input");
    expect(storedShare?.snapshot).not.toHaveProperty("ownerHash");
  });

  it("revokes one share while preserving the private report and other shares", async () => {
    await saveAssessment(assessment());
    await saveShare(share("share-one"));
    await saveShare(share("share-two"));
    expect(await getShare("missing")).toBeNull();

    await revokeShare("share-one");
    expect((await getShare("share-one"))?.revokedAt).toEqual(expect.any(String));
    expect((await getShare("share-two"))?.revokedAt).toBeNull();
    expect(await getAssessment("assessment-1")).not.toBeNull();
    expect(await listShares("assessment-1")).toHaveLength(2);
    expect(await listShares("another-assessment")).toEqual([]);
  });

  it("lists shares by creation time rather than insertion order", async () => {
    await saveAssessment(assessment());
    await saveShare(share("newer", "2026-11-10T15:00:00.000Z"));
    await saveShare(share("older", "2026-11-10T14:00:00.000Z"));
    expect((await listShares("assessment-1")).map((record) => record.id)).toEqual(["newer", "older"]);
  });
});
