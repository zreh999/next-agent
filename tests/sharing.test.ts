import { describe, expect, it } from "vitest";
import { calculateMatch } from "../src/lib/matching";
import { catalog, questionnaire, ruleset } from "../src/lib/content";
import { sanitizeReportForShare } from "../src/lib/sharing";
import type { ReportSnapshot } from "../src/lib/domain";
describe("public report boundary",()=>{
  it("preserves the result while removing all answer evidence, without mutating the private snapshot",()=>{
    const input={questionnaireVersion:questionnaire.version,answers:questionnaire.questions.map(q=>({questionId:q.id,optionId:q.options[0].id})),preferences:{experience:"new" as const,practice:"balanced" as const,communication:"flexible" as const,excludedAgentIds:[]}};
    const result=calculateMatch(input,questionnaire,catalog,ruleset);
    const privateReport:ReportSnapshot={createdAt:"2026-11-10T00:00:00Z",result,agents:catalog.agents.filter(a=>result.recommendations.some(r=>r.agentId===a.id)),dimensions:questionnaire.dimensions};
    const before=JSON.stringify(privateReport);const shared=sanitizeReportForShare(privateReport);
    expect(shared.result.profile).toEqual(result.profile);
    expect(shared.result.recommendations.map(r=>r.agentId)).toEqual(result.recommendations.map(r=>r.agentId));
    expect(shared.result.recommendations.flatMap(r=>r.reasons).every(r=>r.questionIds.length===0)).toBe(true);
    for(const q of questionnaire.questions)expect(JSON.stringify(shared)).not.toContain(q.options[0].label);
    expect(JSON.stringify(privateReport)).toBe(before);
    shared.agents[0].name="changed";expect(JSON.stringify(privateReport)).toBe(before);
  });
});
