import { kindLabels, type ReportSnapshot } from "./domain";
import { site } from "./site";
export async function downloadCard(report: ReportSnapshot) {
  const canvas = document.createElement("canvas"); canvas.width=1200; canvas.height=720;
  const ctx = canvas.getContext("2d"); if(!ctx) throw new Error("当前浏览器暂不支持导出图片。");
  ctx.fillStyle="#0b1117";ctx.fillRect(0,0,1200,720);
  ctx.strokeStyle="#25333d";ctx.lineWidth=1;
  for(let x=40;x<1200;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}
  for(let y=40;y<720;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1200,y);ctx.stroke();}
  ctx.fillStyle="#ff6470";ctx.fillRect(56,56,8,32);
  ctx.font='600 30px "Microsoft YaHei", sans-serif';ctx.fillStyle="#eef0e9";ctx.fillText(`${site.name} / AGENT RESONANCE`,82,82);
  ctx.font='600 52px "Microsoft YaHei", sans-serif';ctx.fillText("我的同频特工",56,170);
  report.result.recommendations.forEach((r,i)=>{const a=report.agents.find(x=>x.id===r.agentId);if(!a)return;const x=56+i*365;ctx.fillStyle="#17232c";ctx.fillRect(x,218,342,175);ctx.fillStyle=i===0?"#a5e9d8":"#aab8c2";ctx.font='22px "Microsoft YaHei", sans-serif';ctx.fillText(kindLabels[r.kind],x+24,257);ctx.fillStyle="#eef0e9";ctx.font='600 38px "Microsoft YaHei", sans-serif';ctx.fillText(a.name,x+24,312);ctx.font='21px sans-serif';ctx.fillStyle="#92a3af";ctx.fillText(a.enName,x+24,356);});
  report.dimensions.forEach((d,i)=>{const y=453+i*34;ctx.fillStyle="#b9c5cc";ctx.font='18px "Microsoft YaHei", sans-serif';ctx.fillText(d.label,56,y);ctx.fillStyle="#28343d";ctx.fillRect(170,y-13,350,8);ctx.fillStyle="#a5e9d8";ctx.fillRect(170,y-13,350*report.result.profile[d.id],8);});
  ctx.fillStyle="#aab8c2";ctx.font='20px "Microsoft YaHei", sans-serif';ctx.fillText("心理学启发 · 玩法偏好探索",630,485);ctx.fillText(`规则 v${report.result.versions.ruleset} · ${report.result.coverageCount}名候选特工`,630,523);ctx.font='18px "Microsoft YaHei", sans-serif';ctx.fillStyle="#788d9c";ctx.fillText("独立粉丝项目，非 Riot Games 官方推荐",56,677);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw new Error("图片导出失败，请再试一次。");
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="agent-resonance-report.png";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
