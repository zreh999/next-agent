import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ownedAssessment } from "@/lib/server/http";
import { getFeedback, listShares } from "@/lib/server/storage";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{id: string}> }) {
  try {
    const { id } = await context.params;
    const assessment = await ownedAssessment(request, id);
    const [feedback, shares] = await Promise.all([getFeedback(id), listShares(id)]);
    return NextResponse.json({ id, input: assessment.input, report: assessment.report, feedback, shares: shares.map(s => ({ id: s.id, createdAt: s.createdAt, revokedAt: s.revokedAt })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
