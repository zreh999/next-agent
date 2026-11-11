import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { AssessmentRecord, FeedbackRecord, ShareRecord } from "../domain";

interface Store { assessments: AssessmentRecord[]; feedback: FeedbackRecord[]; shares: ShareRecord[] }
const globals = globalThis as unknown as { nextAgentDb?: PrismaClient; nextAgentFileQueue?: Promise<void> };
function database() {
  if (!process.env.DATABASE_URL) return null;
  return globals.nextAgentDb ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
function filePath() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_FILE_STORAGE !== "true") throw new Error("请配置数据库后使用，或在有持久磁盘的单实例环境显式启用文件存储。");
  return path.join(process.env.NEXT_AGENT_DATA_DIR ?? path.join(process.cwd(), ".data"), "store.json");
}
async function fileStore<T>(operation: (store: Store) => T | Promise<T>, write = false): Promise<T> {
  const previous = globals.nextAgentFileQueue ?? Promise.resolve();
  let release!: () => void;
  globals.nextAgentFileQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const target = filePath();
    let store: Store;
    try { store = JSON.parse(await readFile(target, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; store = { assessments: [], feedback: [], shares: [] }; }
    const result = await operation(store);
    if (write) {
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(store), { encoding: "utf8", mode: 0o600 });
      await rename(temporary, target);
    }
    return result;
  } finally { release(); }
}
export async function saveAssessment(record: AssessmentRecord) {
  const db = database();
  if (db) { await db.assessment.create({ data: { id: record.id, ownerHash: record.ownerHash, inputJson: JSON.stringify(record.input), reportJson: JSON.stringify(record.report), createdAt: new Date(record.report.createdAt) } }); return; }
  await fileStore(s => { s.assessments.push(record); }, true);
}
export async function getAssessment(id: string): Promise<AssessmentRecord | null> {
  const db = database();
  if (db) { const row = await db.assessment.findUnique({ where: { id } }); return row ? { id: row.id, ownerHash: row.ownerHash, input: JSON.parse(row.inputJson), report: JSON.parse(row.reportJson) } : null; }
  return fileStore(s => s.assessments.find(a => a.id === id) ?? null);
}
export async function saveFeedback(record: FeedbackRecord) {
  const db = database();
  if (db) { await db.feedback.upsert({ where: { assessmentId_agentId_round: { assessmentId: record.assessmentId, agentId: record.agentId, round: record.round } }, create: { id: record.id, assessmentId: record.assessmentId, agentId: record.agentId, round: record.round, payloadJson: JSON.stringify(record) }, update: { payloadJson: JSON.stringify(record) } }); return; }
  await fileStore(s => { const index = s.feedback.findIndex(f => f.assessmentId === record.assessmentId && f.agentId === record.agentId && f.round === record.round); if (index < 0) s.feedback.push(record); else s.feedback[index] = record; }, true);
}
export async function getFeedback(assessmentId: string): Promise<FeedbackRecord[]> {
  const db = database();
  if (db) return (await db.feedback.findMany({ where: { assessmentId }, orderBy: [{ round: "asc" }, { agentId: "asc" }] })).map(r => JSON.parse(r.payloadJson));
  return fileStore(s => s.feedback.filter(f => f.assessmentId === assessmentId).sort((a,b) => a.round-b.round || a.agentId.localeCompare(b.agentId)));
}
export async function saveShare(record: ShareRecord) {
  const db = database();
  if (db) { await db.share.create({ data: { id: record.id, assessmentId: record.assessmentId, snapshotJson: JSON.stringify(record.snapshot), createdAt: new Date(record.createdAt) } }); return; }
  await fileStore(s => { s.shares.push(record); }, true);
}
export async function getShare(id: string): Promise<ShareRecord | null> {
  const db = database();
  if (db) { const r = await db.share.findUnique({ where: { id } }); return r ? { id: r.id, assessmentId: r.assessmentId, snapshot: JSON.parse(r.snapshotJson), createdAt: r.createdAt.toISOString(), revokedAt: r.revokedAt?.toISOString() ?? null } : null; }
  return fileStore(s => s.shares.find(r => r.id === id) ?? null);
}
export async function listShares(assessmentId: string): Promise<ShareRecord[]> {
  const db = database();
  if (db) return (await db.share.findMany({ where: { assessmentId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })).map(r => ({ id: r.id, assessmentId: r.assessmentId, snapshot: JSON.parse(r.snapshotJson), createdAt: r.createdAt.toISOString(), revokedAt: r.revokedAt?.toISOString() ?? null }));
  return fileStore(s => s.shares.filter(r => r.assessmentId === assessmentId).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt) || a.id.localeCompare(b.id)));
}
export async function revokeShare(id: string) {
  const db = database();
  if (db) { await db.share.update({ where: { id }, data: { revokedAt: new Date() } }); return; }
  await fileStore(s => { const r = s.shares.find(r => r.id === id); if (r) r.revokedAt = new Date().toISOString(); }, true);
}
