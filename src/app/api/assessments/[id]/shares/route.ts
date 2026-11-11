import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, guardWrite, ownedAssessment } from "@/lib/server/http";
import { saveShare } from "@/lib/server/storage";
import { sanitizeReportForShare } from "@/lib/sharing";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{id: string}> }) {
  try {
    guardWrite(request); const { id } = await context.params;
    const assessment = await ownedAssessment(request, id);
    const publicId = randomBytes(18).toString("base64url");
    await saveShare({ id: publicId, assessmentId: id, snapshot: sanitizeReportForShare(assessment.report), createdAt: new Date().toISOString(), revokedAt: null });
    return NextResponse.json({ id: publicId, path: `/s/${publicId}` }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
