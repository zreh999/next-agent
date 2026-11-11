import questionnaireData from "../../content/questionnaire.json";
import agentsData from "../../content/agents.json";
import rulesetData from "../../content/ruleset.json";
import { agentCatalogSchema, questionnaireSchema } from "./validation";
import { dimensionIds, type AgentCatalog, type Questionnaire, type Ruleset } from "./domain";

export const questionnaire: Questionnaire = questionnaireSchema.parse(questionnaireData);
export const catalog: AgentCatalog = agentCatalogSchema.parse(agentsData);
export const ruleset: Ruleset = rulesetData;

export function validateContent() {
  const ids = new Set<string>();
  for (const q of questionnaire.questions) {
    if (ids.has(q.id)) throw new Error(`重复题目ID: ${q.id}`);
    ids.add(q.id);
    if (new Set(q.options.map(o => o.id)).size !== q.options.length) throw new Error(`重复选项: ${q.id}`);
    const keys = Object.keys(q.options[0].scores).sort().join(",");
    if (!keys || q.options.some(o => Object.keys(o.scores).sort().join(",") !== keys)) throw new Error(`选项维度不一致: ${q.id}`);
  }
  if (new Set(catalog.agents.map(a => a.id)).size !== catalog.agents.length) throw new Error("重复角色ID");
  if (new Set(questionnaire.dimensions.map(d => d.id)).size !== 5) throw new Error("偏好维度必须唯一");
  for (const d of dimensionIds) {
    if (questionnaire.questions.filter(q => q.options.some(o => o.scores[d] !== undefined)).length < 4) throw new Error(`维度覆盖不足: ${d}`);
    if (!Number.isFinite(ruleset.dimensionWeights[d]) || ruleset.dimensionWeights[d] <= 0) throw new Error(`无效权重: ${d}`);
  }
  return true;
}
validateContent();
