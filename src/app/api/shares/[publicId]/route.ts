import { NextRequest, NextResponse } from "next/server";
import { errorResponse, guardWrite, HttpError, ownedAssessment } from "@/lib/server/http";
import { getShare, revokeShare } from "@/lib/server/storage";
export const runtime = "nodejs";
export async function GET(_request: NextRequest, context: { params: Promise<{publicId: string}> }) {
  try {
    const { publicId } = await context.params; const share = await getShare(publicId);
    if (!share || share.revokedAt) throw new HttpError(404, "分享不存在或已被撤销。");
    return NextResponse.json({ report: share.snapshot }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest, context: { params: Promise<{publicId: string}> }) {
  try {
    guardWrite(request); const { publicId } = await context.params; const share = await getShare(publicId);
    if (!share) throw new HttpError(404, "找不到这条分享。");
    await ownedAssessment(request, share.assessmentId); await revokeShare(publicId);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
