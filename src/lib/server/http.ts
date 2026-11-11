import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAssessment } from "./storage";

export const OWNER_COOKIE = "next_agent_owner";
export function hashOwner(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function ownerToken(request: NextRequest) { const value=request.cookies.get(OWNER_COOKIE)?.value; return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined; }
export function ensureOwner(request: NextRequest) { return ownerToken(request) ?? randomBytes(32).toString("hex"); }
export function setOwner(response: NextResponse, token: string) { response.cookies.set(OWNER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }); }
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function ownedAssessment(request: NextRequest, id: string) {
  const token = ownerToken(request);
  if (!token || !/^[a-zA-Z0-9_-]{10,100}$/.test(id)) throw new HttpError(404, "找不到这份私有报告。请在完成测试的浏览器中打开。");
  const assessment = await getAssessment(id);
  if (!assessment || assessment.ownerHash !== hashOwner(token)) throw new HttpError(404, "找不到这份私有报告。请在完成测试的浏览器中打开。");
  return assessment;
}
const rateGlobals = globalThis as unknown as { nextAgentLimits?: Map<string, { count: number; reset: number }> };
export function guardWrite(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    let sameOrigin = false;
    try {
      const source = new URL(origin);
      // Next dev may canonicalize 127.0.0.1 to localhost in nextUrl. The actual
      // Host header is the browser destination; forwarded hosts are not trusted.
      const destinationHost = request.headers.get("host") ?? request.nextUrl.host;
      sameOrigin = ["http:", "https:"].includes(source.protocol) && source.host === destinationHost;
      if (process.env.APP_ORIGIN) sameOrigin = sameOrigin && source.origin === new URL(process.env.APP_ORIGIN).origin;
    } catch { sameOrigin = false; }
    if (!sameOrigin) throw new HttpError(403, "请从本站提交请求。");
  }
  if (Number(request.headers.get("content-length") ?? "0") > 32_768) throw new HttpError(413, "提交内容过长。");
  const limits = rateGlobals.nextAgentLimits ??= new Map();
  // Only use forwarded addresses when the deployment's trusted ingress overwrites them.
  // This process-local guard is a small-instance backstop, not a distributed quota.
  const key = process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "single-instance";
  const now = Date.now();
  for (const [k, v] of limits) if (v.reset <= now) limits.delete(k);
  const state = limits.get(key) ?? { count: 0, reset: now + 60_000 };
  state.count++; limits.set(key, state);
  if (state.count > 120) throw new HttpError(429, "提交有些频繁，请稍等一分钟。");
}
export async function readJson(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "请求内容为空。");
  const decoder = new TextDecoder(); let size=0; let body="";
  try {
    while (true) { const {value,done}=await reader.read(); if(done)break; size+=value.byteLength; if(size>32_768){await reader.cancel();throw new HttpError(413,"提交内容过长。");} body+=decoder.decode(value,{stream:true}); }
    body+=decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body); } catch { throw new HttpError(400, "请求格式有误，请重新提交。"); }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "答案或记录格式有误，请检查后重试。" }, { status: 400 });
  console.error("[next-agent] request failed", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "暂时无法保存，请保留当前页面后重试。" }, { status: 503 });
}
