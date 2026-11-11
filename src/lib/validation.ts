import { z } from "zod";
import { dimensionIds } from "./domain";

export const profileSchema = z.object({ initiative: z.number().min(0).max(1), intel: z.number().min(0).max(1), setup: z.number().min(0).max(1), adaptability: z.number().min(0).max(1), teamwork: z.number().min(0).max(1) });
export const preferencesSchema = z.object({
  experience: z.enum(["new", "some", "experienced"]),
  practice: z.enum(["light", "balanced", "dedicated"]),
  communication: z.enum(["quiet", "flexible", "active"]),
  excludedAgentIds: z.array(z.string().min(1).max(50)).max(100)
});
export const assessmentInputSchema = z.object({
  questionnaireVersion: z.string().min(1).max(30),
  answers: z.array(z.object({ questionId: z.string().min(1).max(50), optionId: z.string().min(1).max(50) }).strict()).min(1).max(100),
  preferences: preferencesSchema
}).strict();
export const feedbackInputSchema = z.object({
  agentId: z.string().min(1).max(50), round: z.number().int().min(1).max(3),
  enjoyment: z.number().int().min(1).max(5), burden: z.number().int().min(1).max(5),
  wantsContinue: z.boolean(), notes: z.string().max(500).default("")
}).strict();
export const questionnaireSchema = z.object({
  version: z.string(),
  dimensions: z.array(z.object({ id: z.enum(dimensionIds), label: z.string(), lowLabel: z.string(), highLabel: z.string(), description: z.string() })).length(5),
  questions: z.array(z.object({
    id: z.string(), prompt: z.string(), context: z.string().optional(),
    options: z.array(z.object({ id: z.string(), label: z.string(), scores: z.partialRecord(z.enum(dimensionIds), z.number().min(0).max(4)) })).min(2)
  })).min(1)
});
export const agentCatalogSchema = z.object({
  version: z.string(), agents: z.array(z.object({
    id: z.string(), name: z.string(), enName: z.string(), role: z.enum(["duelist", "initiator", "controller", "sentinel"]),
    tagline: z.string(), description: z.string(), profile: profileSchema,
    practiceLoad: z.union([z.literal(1), z.literal(2), z.literal(3)]), communicationLoad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    strengths: z.array(z.string()), tradeoff: z.string(), tryoutTasks: z.array(z.string()).length(3),
    sourceUrl: z.url(), reviewedAt: z.string()
  })).min(1)
});
