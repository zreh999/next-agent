import type {
  AgentCatalog,
  AgentProfile,
  AssessmentInput,
  DimensionId,
  MatchingResult,
  Questionnaire,
  Recommendation,
  Ruleset,
} from "./domain";

const DIMENSION_IDS: DimensionId[] = [
  "initiative",
  "intel",
  "setup",
  "adaptability",
  "teamwork",
];

const ROLES = new Set(["duelist", "initiator", "controller", "sentinel"]);
const PRACTICE_LIMIT = { light: 1, balanced: 2, dedicated: 3 } as const;
const COMMUNICATION_LIMIT = { quiet: 1, flexible: 2, active: 3 } as const;

type Evidence = { questionId: string; optionLabel: string };
type ScoredAgent = {
  agent: AgentProfile;
  distance: number;
  practicePenalty: number;
  communicationPenalty: number;
  cost: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimension(value: string): value is DimensionId {
  return DIMENSION_IDS.includes(value as DimensionId);
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateConfiguration(
  questionnaire: Questionnaire,
  catalog: AgentCatalog,
  rules: Ruleset,
): void {
  if (!questionnaire || !questionnaire.version || !Array.isArray(questionnaire.questions)
    || questionnaire.questions.length === 0 || !Array.isArray(questionnaire.dimensions)) {
    throw new Error("题库配置无效。");
  }

  const dimensionIds = new Set<string>();
  for (const dimension of questionnaire.dimensions) {
    if (!dimension || !isDimension(dimension.id) || dimensionIds.has(dimension.id)) {
      throw new Error("题库包含未知或重复维度。");
    }
    dimensionIds.add(dimension.id);
  }

  const questionIds = new Set<string>();
  for (const question of questionnaire.questions) {
    if (!question || typeof question.id !== "string" || !question.id
      || questionIds.has(question.id) || !Array.isArray(question.options)
      || question.options.length < 2) {
      throw new Error("题目配置无效或题目编号重复。");
    }
    questionIds.add(question.id);
    const optionIds = new Set<string>();
    for (const option of question.options) {
      if (!option || typeof option.id !== "string" || !option.id
        || optionIds.has(option.id) || !isRecord(option.scores)) {
        throw new Error("题目包含无效或重复选项。");
      }
      optionIds.add(option.id);
      for (const [dimension, score] of Object.entries(option.scores)) {
        if (!isDimension(dimension) || !isFiniteInRange(score, 0, 4)) {
          throw new Error("题目维度得分必须在 0 到 4 之间。");
        }
      }
    }
  }

  if (!rules || !rules.version || !isRecord(rules.dimensionWeights)
    || !isFiniteInRange(rules.practicePenalty, 0, 1)
    || !isFiniteInRange(rules.communicationPenalty, 0, 1)
    || !isFiniteInRange(rules.alternativeTolerance, 0, 1)) {
    throw new Error("推荐规则配置无效。");
  }
  for (const dimension of DIMENSION_IDS) {
    const weight = rules.dimensionWeights[dimension];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      throw new Error("维度权重必须是有限的非负数。");
    }
  }

  if (!catalog || !catalog.version || !Array.isArray(catalog.agents)) {
    throw new Error("特工资料配置无效。");
  }
  const agentIds = new Set<string>();
  for (const agent of catalog.agents) {
    if (!agent || typeof agent.id !== "string" || !agent.id
      || agentIds.has(agent.id) || !ROLES.has(agent.role)
      || !isRecord(agent.profile)
      || ![1, 2, 3].includes(agent.practiceLoad)
      || ![1, 2, 3].includes(agent.communicationLoad)) {
      throw new Error("特工资料无效或特工编号重复。");
    }
    agentIds.add(agent.id);
    for (const dimension of DIMENSION_IDS) {
      if (!isFiniteInRange(agent.profile[dimension], 0, 1)) {
        throw new Error("特工画像必须包含 0 到 1 之间的完整维度值。");
      }
    }
  }
}

function validateInput(
  input: AssessmentInput,
  questionnaire: Questionnaire,
  catalog: AgentCatalog,
): void {
  if (!input || input.questionnaireVersion !== questionnaire.version) {
    throw new Error("题库版本已变化，请重新开始测试。");
  }
  if (!Array.isArray(input.answers)) {
    throw new Error("答案格式无效。");
  }
  const questions = new Map(questionnaire.questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  for (const answer of input.answers) {
    if (!answer || typeof answer.questionId !== "string" || typeof answer.optionId !== "string") {
      throw new Error("答案格式无效。");
    }
    if (seen.has(answer.questionId)) {
      throw new Error("每道题只能提交一个答案，不能重复答题。");
    }
    const question = questions.get(answer.questionId);
    if (!question) {
      throw new Error("答案包含未知题目。");
    }
    if (!question.options.some((option) => option.id === answer.optionId)) {
      throw new Error("答案包含无效选项。");
    }
    seen.add(answer.questionId);
  }
  if (seen.size !== questions.size) {
    throw new Error("请完整回答所有题目。");
  }

  const preferences = input.preferences;
  if (!preferences || !["new", "some", "experienced"].includes(preferences.experience)
    || !Object.hasOwn(PRACTICE_LIMIT, preferences.practice)
    || !Object.hasOwn(COMMUNICATION_LIMIT, preferences.communication)
    || !Array.isArray(preferences.excludedAgentIds)) {
    throw new Error("玩法条件格式无效。");
  }
  const agentIds = new Set(catalog.agents.map((agent) => agent.id));
  for (const id of preferences.excludedAgentIds) {
    if (typeof id !== "string" || !agentIds.has(id)) {
      throw new Error("排除条件包含未知特工。");
    }
  }
}

/**
 * Deterministic, versioned preference matching. Scores describe this ruleset,
 * not psychological validity, player skill, or a probability of success.
 */
export function calculateMatch(
  input: AssessmentInput,
  questionnaire: Questionnaire,
  catalog: AgentCatalog,
  rules: Ruleset,
): MatchingResult {
  validateConfiguration(questionnaire, catalog, rules);
  validateInput(input, questionnaire, catalog);

  const sums = Object.fromEntries(DIMENSION_IDS.map((id) => [id, 0])) as Record<DimensionId, number>;
  const evidence = Object.fromEntries(DIMENSION_IDS.map((id) => [id, [] as Evidence[]])) as Record<DimensionId, Evidence[]>;
  const answers = new Map(input.answers.map((answer) => [answer.questionId, answer.optionId]));

  // Iterate in questionnaire order, so even reordered API answers reproduce exactly.
  for (const question of questionnaire.questions) {
    const option = question.options.find((item) => item.id === answers.get(question.id))!;
    for (const dimension of DIMENSION_IDS) {
      const score = option.scores[dimension];
      if (score !== undefined) {
        sums[dimension] += score / 4;
        evidence[dimension].push({ questionId: question.id, optionLabel: option.label });
      }
    }
  }

  // A neutral display value is used for uncovered axes, but never enters distance.
  const profile = Object.fromEntries(DIMENSION_IDS.map((id) => [
    id,
    evidence[id].length ? sums[id] / evidence[id].length : 0.5,
  ])) as Record<DimensionId, number>;
  const coveredDimensions = DIMENSION_IDS.filter((id) => evidence[id].length && rules.dimensionWeights[id] > 0);
  const totalWeight = coveredDimensions.reduce((sum, id) => sum + rules.dimensionWeights[id], 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error("当前答案没有可用于推荐的有效维度。");
  }

  const excludedIds = new Set(input.preferences.excludedAgentIds);
  const practiceLimit = PRACTICE_LIMIT[input.preferences.practice];
  const communicationLimit = COMMUNICATION_LIMIT[input.preferences.communication];
  const ranked: ScoredAgent[] = catalog.agents
    .filter((agent) => !excludedIds.has(agent.id))
    .map((agent) => {
      const distance = coveredDimensions.reduce(
        (sum, id) => sum + rules.dimensionWeights[id] * Math.abs(profile[id] - agent.profile[id]),
        0,
      ) / totalWeight;
      const practicePenalty = Math.max(0, agent.practiceLoad - practiceLimit) * rules.practicePenalty;
      const communicationPenalty = Math.max(0, agent.communicationLoad - communicationLimit) * rules.communicationPenalty;
      return { agent, distance, practicePenalty, communicationPenalty,
        cost: distance + practicePenalty + communicationPenalty };
    })
    .sort((left, right) => left.cost - right.cost || compareIds(left.agent.id, right.agent.id));

  if (!ranked.length) {
    throw new Error("当前条件下没有可推荐的特工，请减少排除项。");
  }

  const best = ranked[0];
  const remaining = ranked.slice(1);
  const alternative = remaining.find((item) =>
    item.agent.role !== best.agent.role
    && item.cost - best.cost <= rules.alternativeTolerance + Number.EPSILON,
  ) ?? remaining[0];
  const selectedRoles = new Set([best.agent.role, ...(alternative ? [alternative.agent.role] : [])]);
  const explorationPool = remaining.filter((item) =>
    item !== alternative
    && item.agent.practiceLoad <= practiceLimit
    && item.agent.communicationLoad <= communicationLimit,
  );
  const explore = explorationPool.find((item) => !selectedRoles.has(item.agent.role)) ?? explorationPool[0];

  const dimensionLabels = new Map(questionnaire.dimensions.map((dimension) => [dimension.id, dimension]));
  const toRecommendation = (scored: ScoredAgent, kind: Recommendation["kind"]): Recommendation => {
    const reasonDimensions = [...coveredDimensions].sort((left, right) => {
      const leftContribution = rules.dimensionWeights[left] * (1 - Math.abs(profile[left] - scored.agent.profile[left]));
      const rightContribution = rules.dimensionWeights[right] * (1 - Math.abs(profile[right] - scored.agent.profile[right]));
      return rightContribution - leftContribution || DIMENSION_IDS.indexOf(left) - DIMENSION_IDS.indexOf(right);
    }).slice(0, 2);

    const reasons = reasonDimensions.map((dimension) => {
      const metadata = dimensionLabels.get(dimension);
      const label = metadata?.label ?? dimension;
      const preferenceLabel = profile[dimension] <= 1 / 3
        ? metadata?.lowLabel ?? "较低一侧"
        : profile[dimension] >= 2 / 3
          ? metadata?.highLabel ?? "较高一侧"
          : "两种方式之间";
      const delta = Math.abs(profile[dimension] - scored.agent.profile[dimension]);
      const alignment = delta <= 0.2 ? "较贴近" : delta <= 0.45 ? "存在一定差异" : "差异较大";
      return {
        dimension,
        text: `你在相关题目选择了「${evidence[dimension][0].optionLabel}」等回答，${label}更偏向「${preferenceLabel}」；${scored.agent.name}的这一项玩法画像与你${alignment}。`,
        questionIds: evidence[dimension].map((item) => item.questionId),
      };
    });

    return {
      agentId: scored.agent.id,
      kind,
      fitScore: Math.round(Math.max(0, Math.min(1, 1 - scored.cost)) * 1000) / 10,
      reasons,
      tradeoff: scored.agent.tradeoff,
      scoreBreakdown: {
        distance: scored.distance,
        practicePenalty: scored.practicePenalty,
        communicationPenalty: scored.communicationPenalty,
      },
    };
  };

  return {
    profile,
    recommendations: [
      toRecommendation(best, "best"),
      ...(alternative ? [toRecommendation(alternative, "alternative")] : []),
      ...(explore ? [toRecommendation(explore, "explore")] : []),
    ],
    versions: { questionnaire: questionnaire.version, ruleset: rules.version, agents: catalog.version },
    coverageCount: catalog.agents.length,
  };
}
