import { kindLabels, roleLabels, type AgentProfile, type ReportSnapshot } from "./domain";
import { getAgentMedia } from "./agent-media";
import { site } from "./site";

const WIDTH = 1080;
const HEIGHT = 1440;
const FALLBACK_ACCENT = "#a5e9d8";
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
type CardAgent = { agent: AgentProfile; kind: keyof typeof kindLabels };
export interface CardDownloadResult { artworkIncluded: boolean; warnings: string[] }
export interface RenderedCard extends CardDownloadResult { blob: Blob }

function accentFor(id: string) {
  const accent = getAgentMedia(id)?.accent;
  return accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : FALLBACK_ACCENT;
}

function orderedAgents(report: ReportSnapshot): CardAgent[] {
  return report.result.recommendations.flatMap(recommendation => {
    const agent = report.agents.find(item => item.id === recommendation.agentId);
    return agent ? [{ agent, kind: recommendation.kind }] : [];
  });
}

function loadPortrait(url: string): Promise<HTMLImageElement | null> {
  const existing = imageCache.get(url);
  if (existing) return existing;
  const pending = new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image();
    let settled = false;
    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (!result) imageCache.delete(url);
      resolve(result);
    };
    const timer = window.setTimeout(() => { finish(null); image.src = ""; }, 8000);
    // Set CORS before src: an image that cannot be safely exported must use the fallback.
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null);
    image.onerror = () => finish(null);
    image.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

function font(ctx: CanvasRenderingContext2D, size: number, weight = 500, mono = false) {
  ctx.font = weight + " " + size + "px " + (mono
    ? '"Cascadia Code", Consolas, monospace'
    : '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif');
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, weight = 600, mono = false) {
  let current = size;
  font(ctx, current, weight, mono);
  while (ctx.measureText(text).width > width && current > 12) font(ctx, --current, weight, mono);
  ctx.fillText(text, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 3) {
  const characters = Array.from(text);
  const lines: string[] = [];
  let line = "";
  for (const character of characters) {
    if (character === "\n" || (line && ctx.measureText(line + character).width > width)) {
      lines.push(line); line = character === "\n" ? "" : character;
    } else line += character;
  }
  if (line) lines.push(line);
  for (let index = 0; index < Math.min(lines.length, maxLines); index++) {
    let value = lines[index];
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (value && ctx.measureText(value + "…").width > width) value = value.slice(0, -1);
      value += "…";
    }
    ctx.fillText(value, x, y + index * lineHeight);
  }
}

function polygon(ctx: CanvasRenderingContext2D, points: number[][], fill: string) {
  ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

function containImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + height - drawHeight, drawWidth, drawHeight);
}

function geometricPortrait(ctx: CanvasRenderingContext2D, agent: AgentProfile, x: number, y: number, width: number, height: number) {
  const accent = accentFor(agent.id);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  const centerX = x + width * .54;
  const centerY = y + height * .49;
  ctx.strokeStyle = accent + "60"; ctx.lineWidth = 2;
  for (const fraction of [.24, .34, .45]) {
    ctx.beginPath(); ctx.arc(centerX, centerY, width * fraction, 0, Math.PI * 2); ctx.stroke();
  }
  polygon(ctx, [[centerX-width*.2,y+height*.25],[centerX+width*.18,y+height*.2],[centerX+width*.3,y+height*.72],[centerX-width*.3,y+height*.8]], accent + "18");
  ctx.fillStyle = accent;
  font(ctx, Math.min(width * .75, height * .5), 700, true);
  ctx.textAlign = "center"; ctx.fillText(agent.id.slice(0, 1).toUpperCase(), centerX, centerY + height * .16);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPoster(ctx: CanvasRenderingContext2D, report: ReportSnapshot, portraits: Map<string, HTMLImageElement>) {
  const agents = orderedAgents(report);
  const primary = agents[0]?.agent;
  if (!primary) throw new Error("这份报告还没有可生成分享卡的候选，请重新探索。");
  const accent = accentFor(primary.id);
  ctx.fillStyle = "#090f16"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(795, 505, 10, 795, 505, 660);
  glow.addColorStop(0, accent + "62"); glow.addColorStop(.6, accent + "12"); glow.addColorStop(1, "#090f1600");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, 1080);
  polygon(ctx, [[420,130],[1080,130],[1080,810],[670,1010],[340,1010]], accent + "16");
  polygon(ctx, [[0,1008],[1080,848],[1080,1010],[0,1120]], "#ff64701d");
  ctx.strokeStyle = "#f3f0e810"; ctx.lineWidth = 1;
  for (let x = 48; x < WIDTH; x += 48) { ctx.beginPath(); ctx.moveTo(x, 112); ctx.lineTo(x, 1370); ctx.stroke(); }
  for (let y = 112; y < HEIGHT - 60; y += 48) { ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(WIDTH - 48, y); ctx.stroke(); }

  const heroImage = portraits.get(primary.id);
  if (heroImage) containImage(ctx, heroImage, 290, 126, 800, 880);
  else geometricPortrait(ctx, primary, 345, 150, 680, 790);
  // Preserve the portrait silhouette while keeping left-hand typography readable.
  const shade = ctx.createLinearGradient(0, 0, 840, 0);
  shade.addColorStop(0, "#090f16"); shade.addColorStop(.38, "#090f16ef"); shade.addColorStop(.64, "#090f1675"); shade.addColorStop(1, "#090f1600");
  ctx.fillStyle = shade; ctx.fillRect(0, 112, WIDTH, 904);
  const bottomShade = ctx.createLinearGradient(0, 810, 0, 1030);
  bottomShade.addColorStop(0, "#090f1600"); bottomShade.addColorStop(1, "#090f16");
  ctx.fillStyle = bottomShade; ctx.fillRect(0, 810, WIDTH, 230);

  ctx.fillStyle = "#ff6470"; ctx.fillRect(64, 55, 7, 28);
  ctx.fillStyle = "#eceee8"; font(ctx, 25, 600); ctx.fillText(site.name, 89, 78);
  ctx.fillStyle = "#a6b7c3"; font(ctx, 13, 500, true); ctx.fillText("AGENT RESONANCE / PLAYER EDITION", 245, 76);
  ctx.textAlign = "right"; ctx.fillStyle = accent; font(ctx, 13, 500, true); ctx.fillText("NO. 01", 1016, 76); ctx.textAlign = "left";
  ctx.strokeStyle = "#c7d5df32"; ctx.beginPath(); ctx.moveTo(64, 108); ctx.lineTo(1016, 108); ctx.stroke();

  ctx.fillStyle = accent; font(ctx, 18, 600, true); ctx.fillText("YOUR NEXT MAIN", 66, 174);
  ctx.fillStyle = "#b6c4ce"; font(ctx, 21, 500); ctx.fillText(kindLabels[agents[0].kind] + " / " + roleLabels[primary.role], 66, 216);
  ctx.fillStyle = "#f0efe8"; fitText(ctx, primary.name, 56, 354, 540, 122, 700);
  ctx.fillStyle = accent; fitText(ctx, primary.enName.toUpperCase(), 66, 421, 480, 49, 600, true);
  ctx.fillStyle = "#849aa9"; font(ctx, 14, 500); ctx.fillText("玩法印象", 68, 479);
  ctx.fillStyle = "#c1cdd5"; font(ctx, 26, 500); wrapText(ctx, primary.tagline, 68, 516, 360, 37, 2);
  const quote = getAgentMedia(primary.id)?.quote;
  if (quote) {
    ctx.fillStyle = accent; ctx.fillRect(68, 625, 3, 180);
    font(ctx, 14, 500); ctx.fillText(quote.translation ? "角色台词｜中文译意" : "角色台词｜英文原句", 85, 645);
    ctx.fillStyle = "#e4e9e6"; font(ctx, 34, 500);
    wrapText(ctx, quote.translation ?? quote.text, 85, 684, 360, 44, 3);
    if (quote.translation) {
      ctx.fillStyle = "#93a9b7"; font(ctx, 20, 400);
      wrapText(ctx, quote.text, 85, 807, 355, 26, 2);
    }
  } else {
    ctx.fillStyle = "#849aa9"; font(ctx, 19, 400);
    wrapText(ctx, "不是替你决定本命，\n是给下一局一个新选择。", 68, 683, 370, 35, 3);
  }
  ctx.fillStyle = accent; ctx.fillRect(68, 855, 84, 4);
  ctx.fillStyle = "#93a5b1"; font(ctx, 14, 500, true);
  ctx.fillText("Q " + report.result.versions.questionnaire + " / R " + report.result.versions.ruleset, 68, 891);
  ctx.fillText("CREATED " + report.createdAt.slice(0, 10), 68, 917);

  ctx.fillStyle = "#8196a4"; font(ctx, 13, 500, true); ctx.fillText("OTHER FREQUENCIES", 66, 1001);
  const alternatives = agents.slice(1, 3);
  alternatives.forEach((item, index) => {
    const x = 64 + index * 486;
    const y = 1020;
    const localAccent = accentFor(item.agent.id);
    ctx.fillStyle = "#111c26"; ctx.fillRect(x, y, 466, 152);
    ctx.fillStyle = localAccent; ctx.fillRect(x, y, 3, 152);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 258, y, 208, 152); ctx.clip();
    const portrait = portraits.get(item.agent.id);
    if (portrait) containImage(ctx, portrait, x + 245, y - 12, 230, 183);
    else geometricPortrait(ctx, item.agent, x + 276, y + 6, 160, 144);
    ctx.restore();
    const fade = ctx.createLinearGradient(x + 215, 0, x + 365, 0);
    fade.addColorStop(0, "#111c26"); fade.addColorStop(1, "#111c2600");
    ctx.fillStyle = fade; ctx.fillRect(x + 215, y, 155, 152);
    ctx.fillStyle = localAccent; font(ctx, 15, 500); ctx.fillText(kindLabels[item.kind], x + 21, y + 32);
    ctx.fillStyle = "#eef0e9"; fitText(ctx, item.agent.name, x + 21, y + 83, 244, 38, 650);
    ctx.fillStyle = "#91a5b3"; fitText(ctx, item.agent.enName.toUpperCase(), x + 22, y + 116, 235, 15, 500, true);
  });
  if (!alternatives.length) {
    ctx.fillStyle = "#91a5b3"; font(ctx, 22, 500); ctx.fillText("这次只留下有依据的候选。", 66, 1090);
  }

  // An abstract visual motif, not a recording or a measured voiceprint.
  ctx.fillStyle = accent + "a8";
  const seed = Array.from(primary.id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  for (let index = 0; index < 79; index++) {
    const height = 3 + Math.abs(Math.sin(index * .72 + seed) * Math.cos(index * .19)) * 22;
    ctx.fillRect(66 + index * 12, 1217 - height / 2, 3, height);
  }
  ctx.fillStyle = "#d5dedf"; font(ctx, 18, 500); ctx.fillText("我的玩法坐标", 66, 1262);
  report.dimensions.slice(0, 5).forEach((dimension, index) => {
    const x = 66 + index * 194;
    ctx.fillStyle = "#b4c3cc"; fitText(ctx, dimension.label, x, 1301, 174, 18, 500);
    ctx.fillStyle = "#263844"; ctx.fillRect(x, 1320, 170, 5);
    ctx.fillStyle = accent; ctx.fillRect(x, 1320, 170 * Math.max(0, Math.min(1, report.result.profile[dimension.id])), 5);
  });
  ctx.strokeStyle = "#c7d5df25"; ctx.beginPath(); ctx.moveTo(64, 1360); ctx.lineTo(1016, 1360); ctx.stroke();
  ctx.fillStyle = "#8093a1"; font(ctx, 13, 400);
  ctx.fillText("心理学启发的玩法探索 · 非人格测量 · 比较 " + report.result.coverageCount + " 名候选", 66, 1391);
  font(ctx, 12, 400); ctx.fillText("独立粉丝项目。VALORANT 角色素材属于 Riot Games；非官方推荐。", 66, 1416);
}

function toPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片导出失败，请再试一次。")), "image/png"); }
    catch { reject(new Error("浏览器未允许导出角色图片。")); }
  });
}

/** Renders the illustrated PNG without uploading local answers or feedback. */
export async function renderCard(report: ReportSnapshot): Promise<RenderedCard> {
  const agents = orderedAgents(report);
  if (!agents.length) throw new Error("这份报告没有可导出的候选。");
  if (document.fonts?.ready) await Promise.race([
    document.fonts.ready.catch(() => undefined),
    new Promise<void>(resolve => window.setTimeout(resolve, 1200)),
  ]);
  const warnings: string[] = [];
  const portraits = new Map<string, HTMLImageElement>();
  await Promise.all(agents.map(async ({ agent }) => {
    const url = getAgentMedia(agent.id)?.portraitUrl;
    if (!url) { warnings.push(agent.name + "暂未配置可核实立绘，使用原创几何图形。"); return; }
    const image = await loadPortrait(url);
    if (image) portraits.set(agent.id, image);
    else warnings.push(agent.name + "的立绘未能加载，已改用原创几何图形。");
  }));
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH; canvas.height = HEIGHT;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器暂不支持导出图片。");
  drawPoster(ctx, report, portraits);
  let blob: Blob;
  try { blob = await toPng(canvas); }
  catch {
    // Resetting dimensions also resets a canvas's origin-clean state.
    canvas.width = WIDTH; canvas.height = HEIGHT;
    ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器暂不支持导出图片。");
    portraits.clear();
    drawPoster(ctx, report, portraits);
    blob = await toPng(canvas);
    warnings.push("浏览器限制了角色素材导出，已为你生成完整的几何艺术版。");
  }
  return { blob, artworkIncluded: portraits.has(agents[0].agent.id), warnings };
}

/** Downloads the illustrated poster as a static PNG. */
export async function downloadCard(report: ReportSnapshot): Promise<CardDownloadResult> {
  const { blob, artworkIncluded, warnings } = await renderCard(report);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "agent-resonance-report.png";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { artworkIncluded, warnings };
}
