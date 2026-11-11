import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assessmentInputSchema } from "@/lib/validation";
import { catalog, questionnaire, ruleset } from "@/lib/content";
import { calculateMatch } from "@/lib/matching";
import { saveAssessment } from "@/lib/server/storage";
import { ensureOwner, errorResponse, guardWrite, hashOwner, HttpError, readJson, setOwner } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    guardWrite(request);
    const input = assessmentInputSchema.parse(await readJson(request));
    let result;
    try { result = calculateMatch(input, questionnaire, catalog, ruleset); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "请检查答案后重试。"); }
    const id = randomUUID(); const token = ensureOwner(request);
    const report = { createdAt: new Date().toISOString(), result, agents: catalog.agents.filter(a => result.recommendations.some(r => r.agentId === a.id)), dimensions: questionnaire.dimensions };
    await saveAssessment({ id, ownerHash: hashOwner(token), input, report });
    const response = NextResponse.json({ id, report }, { status: 201 }); setOwner(response, token); return response;
  } catch (error) { return errorResponse(error); }
}
