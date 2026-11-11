import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { feedbackInputSchema } from "@/lib/validation";
import { errorResponse, guardWrite, HttpError, ownedAssessment, readJson } from "@/lib/server/http";
import { saveFeedback } from "@/lib/server/storage";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{id: string}> }) {
  try {
    guardWrite(request); const { id } = await context.params;
    const assessment = await ownedAssessment(request, id);
    const input = feedbackInputSchema.parse(await readJson(request));
    if (!assessment.report.agents.some(a => a.id === input.agentId)) throw new HttpError(400, "请记录本份报告中的候选特工。");
    const record = { ...input, id: randomUUID(), assessmentId: id, createdAt: new Date().toISOString() };
    await saveFeedback(record); return NextResponse.json({ feedback: record }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
