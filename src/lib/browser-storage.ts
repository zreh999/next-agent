import { z } from "zod";
import { catalog, questionnaire, ruleset } from "./content";
import { calculateMatch } from "./matching";
import { dimensionIds, type AssessmentInput, type FeedbackRecord, type ReportSnapshot } from "./domain";
import { agentCatalogSchema, assessmentInputSchema, feedbackInputSchema, profileSchema, questionnaireSchema } from "./validation";

export interface LocalAssessment { id: string; input: AssessmentInput; report: ReportSnapshot }
export type LocalStorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const ASSESSMENT_PREFIX = "next-agent-local-v1:assessment:";
const FEEDBACK_PREFIX = "next-agent-local-v1:feedback:";
const LATEST_KEY = "next-agent-last-result";
const validId = /^[a-zA-Z0-9_-]{10,100}$/;
const reportSchema: z.ZodType<ReportSnapshot> = z.object({
  createdAt: z.iso.datetime(),
  dimensions: questionnaireSchema.shape.dimensions,
  agents: agentCatalogSchema.shape.agents.max(3),
  result: z.object({
    profile: profileSchema,
    recommendations: z.array(z.object({
      agentId: z.string().min(1).max(50), kind: z.enum(["best", "alternative", "explore"]),
      fitScore: z.number().min(0).max(100),
      reasons: z.array(z.object({ dimension: z.enum(dimensionIds), text: z.string(), questionIds: z.array(z.string()) })),
      tradeoff: z.string(),
      scoreBreakdown: z.object({ distance: z.number().nonnegative(), practicePenalty: z.number().nonnegative(), communicationPenalty: z.number().nonnegative() }),
    })).min(1).max(3),
    versions: z.object({ questionnaire: z.string(), ruleset: z.string(), agents: z.string() }),
    coverageCount: z.number().int().positive(),
  }),
});
const localAssessmentSchema = z.object({ schemaVersion: z.literal(1), id: z.string().regex(validId), input: assessmentInputSchema, report: reportSchema });
const localFeedbackSchema = feedbackInputSchema.extend({ id: z.string().regex(validId), assessmentId: z.string().regex(validId), createdAt: z.iso.datetime() });

function storageError(action: "read" | "write") {
  return new Error(action === "read"
    ? "无法读取本机记录。请允许此网站使用浏览器存储，并使用原来的浏览器打开。"
    : "未能保存到此浏览器。请检查浏览器存储权限或可用空间后重试；当前回答仍保留在页面中。");
}

/** Browser-independent adapter keeps persistence behavior testable without a server. */
export function createLocalStore(storage: LocalStorageAdapter, environment: { now?: () => Date; randomId?: () => string } = {}) {
  const now = environment.now ?? (() => new Date());
  const randomId = environment.randomId ?? (() => globalThis.crypto.randomUUID());

  function read(key: string) {
    try { return storage.getItem(key); }
    catch { throw storageError("read"); }
  }
  function write(key: string, value: string) {
    try { storage.setItem(key, value); }
    catch { throw storageError("write"); }
  }
  function getAssessment(id: string): LocalAssessment | null {
    if (!validId.test(id)) return null;
    const raw = read(`${ASSESSMENT_PREFIX}${id}`);
    if (raw === null) return null;
    try {
      const record = localAssessmentSchema.parse(JSON.parse(raw));
      const recommended = record.report.result.recommendations.map(item => item.agentId);
      const available = record.report.agents.map(agent => agent.id);
      if (record.id !== id || record.input.questionnaireVersion !== record.report.result.versions.questionnaire
        || new Set(recommended).size !== recommended.length || new Set(available).size !== available.length
        || available.length !== recommended.length || recommended.some(agentId => !available.includes(agentId))
        || new Set(record.report.dimensions.map(dimension => dimension.id)).size !== dimensionIds.length) throw new Error("invalid snapshot");
      return { id: record.id, input: record.input, report: record.report };
    } catch { throw new Error("这份本机报告已损坏或格式不兼容，请重新完成探索。原始记录没有被覆盖。"); }
  }
  function getLatestId(): string | null {
    const id = read(LATEST_KEY);
    return id !== null && validId.test(id) ? id : null;
  }
  function createAssessment(value: AssessmentInput): LocalAssessment {
    const input = assessmentInputSchema.parse(value);
    const result = calculateMatch(input, questionnaire, catalog, ruleset);
    const id = randomId();
    if (!validId.test(id)) throw new Error("无法创建本机报告编号，请刷新后重试。");
    const record: LocalAssessment = {
      id, input,
      report: {
        createdAt: now().toISOString(), result,
        agents: catalog.agents.filter(agent => result.recommendations.some(recommendation => recommendation.agentId === agent.id)),
        dimensions: questionnaire.dimensions,
      },
    };
    const key = `${ASSESSMENT_PREFIX}${id}`;
    if (read(key) !== null) throw new Error("报告编号冲突，请重试。已有报告没有被覆盖。");
    write(key, JSON.stringify({ schemaVersion: 1, ...record }));
    try { write(LATEST_KEY, id); }
    catch (error) {
      // A failed latest-pointer update must not report a successful submission.
      try { storage.removeItem(key); } catch { /* Keep any remaining record rather than erase unrelated data. */ }
      throw error;
    }
    return structuredClone(record);
  }
  function getFeedback(id: string): FeedbackRecord[] {
    const assessment = getAssessment(id);
    if (!assessment) return [];
    const raw = read(`${FEEDBACK_PREFIX}${id}`);
    if (raw === null) return [];
    try {
      const records = z.array(localFeedbackSchema).max(9).parse(JSON.parse(raw));
      const slots = records.map(record => `${record.agentId}:${record.round}`);
      if (new Set(slots).size !== records.length || records.some(record => record.assessmentId !== id
        || !assessment.report.result.recommendations.some(recommendation => recommendation.agentId === record.agentId))) throw new Error("invalid feedback");
      return records.sort((left, right) => left.round - right.round || left.agentId.localeCompare(right.agentId));
    } catch { throw new Error("这份报告的本机试玩记录已损坏，未覆盖原始记录。"); }
  }
  function saveFeedback(id: string, value: unknown): FeedbackRecord {
    const assessment = getAssessment(id);
    if (!assessment) throw new Error("此浏览器中没有这份报告，请先完成探索。");
    const parsed = feedbackInputSchema.safeParse(value);
    if (!parsed.success) throw new Error("试玩记录格式有误，请检查评分、局数和备注后重试。");
    const input = parsed.data;
    if (!assessment.report.result.recommendations.some(recommendation => recommendation.agentId === input.agentId)) throw new Error("只能记录这份报告推荐的特工。");
    const feedback = getFeedback(id);
    const index = feedback.findIndex(record => record.agentId === input.agentId && record.round === input.round);
    const record: FeedbackRecord = { ...input, id: index >= 0 ? feedback[index].id : randomId(), assessmentId: id, createdAt: now().toISOString() };
    if (index >= 0) feedback[index] = record;
    else feedback.push(record);
    write(`${FEEDBACK_PREFIX}${id}`, JSON.stringify(feedback));
    return structuredClone(record);
  }
  return { createAssessment, getAssessment, getLatestId, getFeedback, saveFeedback };
}

function browserStore() {
  try {
    if (typeof window === "undefined") throw new Error("browser required");
    return createLocalStore(window.localStorage);
  } catch { throw storageError("read"); }
}

export function createLocalAssessment(input: AssessmentInput) { return browserStore().createAssessment(input); }
export function getLocalAssessment(id: string) { return browserStore().getAssessment(id); }
export function getLatestAssessmentId() { return browserStore().getLatestId(); }
export function getLocalFeedback(id: string) { return browserStore().getFeedback(id); }
export function saveLocalFeedback(id: string, input: unknown) { return browserStore().saveFeedback(id, input); }
