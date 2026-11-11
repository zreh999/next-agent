export const dimensionIds = ["initiative", "intel", "setup", "adaptability", "teamwork"] as const;
export type DimensionId = (typeof dimensionIds)[number];
export type Profile = Record<DimensionId, number>;
export type AgentRole = "duelist" | "initiator" | "controller" | "sentinel";
export interface Dimension { id: DimensionId; label: string; lowLabel: string; highLabel: string; description: string }
export interface QuestionOption { id: string; label: string; scores: Partial<Profile> }
export interface Question { id: string; prompt: string; context?: string; options: QuestionOption[] }
export interface Questionnaire { version: string; dimensions: Dimension[]; questions: Question[] }
export interface AgentProfile {
  id: string; name: string; enName: string; role: AgentRole; tagline: string; description: string;
  profile: Profile; practiceLoad: 1 | 2 | 3; communicationLoad: 1 | 2 | 3;
  strengths: string[]; tradeoff: string; tryoutTasks: string[]; sourceUrl: string; reviewedAt: string;
}
export interface AgentCatalog { version: string; agents: AgentProfile[] }
export interface Ruleset {
  version: string; dimensionWeights: Profile; practicePenalty: number; communicationPenalty: number; alternativeTolerance: number;
}
export interface Preferences {
  experience: "new" | "some" | "experienced";
  practice: "light" | "balanced" | "dedicated";
  communication: "quiet" | "flexible" | "active";
  excludedAgentIds: string[];
}
export interface Answer { questionId: string; optionId: string }
export interface AssessmentInput { questionnaireVersion: string; answers: Answer[]; preferences: Preferences }
export interface Recommendation {
  agentId: string; kind: "best" | "alternative" | "explore"; fitScore: number;
  reasons: { dimension: DimensionId; text: string; questionIds: string[] }[];
  tradeoff: string;
  scoreBreakdown: { distance: number; practicePenalty: number; communicationPenalty: number };
}
export interface MatchingResult {
  profile: Profile; recommendations: Recommendation[];
  versions: { questionnaire: string; ruleset: string; agents: string }; coverageCount: number;
}
export interface ReportSnapshot {
  createdAt: string; result: MatchingResult; agents: AgentProfile[]; dimensions: Dimension[];
}
export interface AssessmentRecord {
  id: string; ownerHash: string; input: AssessmentInput; report: ReportSnapshot;
}
export interface FeedbackRecord {
  id: string; assessmentId: string; agentId: string; round: number; enjoyment: number; burden: number;
  wantsContinue: boolean; notes: string; createdAt: string;
}
export interface ShareRecord {
  id: string; assessmentId: string; snapshot: ReportSnapshot; createdAt: string; revokedAt: string | null;
}
export const roleLabels: Record<AgentRole, string> = { duelist: "决斗", initiator: "先锋", controller: "控场", sentinel: "哨卫" };
export const kindLabels = { best: "首推", alternative: "相近替代", explore: "换种打法" } as const;
