"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Download, SlidersHorizontal } from "lucide-react";
import { AgentGlyph } from "./agent-glyph";
import { ProfileCharts } from "./profile-charts";
import { kindLabels, roleLabels, type ReportSnapshot } from "@/lib/domain";
import { downloadCard } from "@/lib/download-card";
import { ArtShareCard } from "./art-share-card";
import { getLatestAssessmentId, getLocalAssessment } from "@/lib/browser-storage";

export function ReportClient() {
  const requestedId=useSearchParams().get("id");
  const [id,setId]=useState("");
  const [report,setReport]=useState<ReportSnapshot|null>(null);
  const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{
    setReport(null);setError("");setNotice("");
    try {
      const reportId=requestedId||getLatestAssessmentId();
      if(!reportId)throw new Error("此浏览器中还没有报告。完成一次探索后，报告会保存在这里。");
      const assessment=getLocalAssessment(reportId);
      if(!assessment)throw new Error("此浏览器中找不到这份报告。报告仅保存在生成它的浏览器中，清除站点数据后无法自动恢复。");
      setId(assessment.id);setReport(assessment.report);
    } catch(e) { setError(e instanceof Error?e.message:"报告暂时无法打开。"); }
  },[requestedId]);
  async function exportCard(){
    if(!report)return;
    setBusy(true);setError("");setNotice("");
    try{const result=await downloadCard(report);setNotice((result.artworkIncluded?"立绘海报已生成。":"艺术海报已生成。")+result.warnings.join(" ")+" 你可以把图片发送给队友，报告和试玩记录仍保存在此浏览器。");}
    catch(e){setError(e instanceof Error?e.message:"图片暂时无法下载，请重试。");}
    finally{setBusy(false);}
  }
  if(!report)return <div className="section-shell empty-state">{error?<><span className="eyebrow">REPORT UNAVAILABLE</span><h1>这份报告暂时无法打开。</h1><p role="alert">{error}</p><Link href="/quiz" className="button button-primary">重新探索 <ArrowRight size={17}/></Link></>:<div className="page-loading" role="status"><span className="loading-orbit"/><p>正在读取你的玩法信号…</p></div>}</div>;
  return <div className="section-shell report-page"><div className="report-intro"><div><div className="eyebrow">YOUR AGENT RESONANCE</div><h1>与你同频的，<br className="mobile-break"/><span className="text-accent">不止一种可能。</span></h1><p>这些名字是探索的起点。用几局真实体验，听听哪一种打法会有回响。</p></div><span className="report-stamp"><i className="status-dot"/> 同频探索报告<small>RULESET {report.result.versions.ruleset}</small></span></div>
    <div className="report-actions"><Link href={`/tryout/?id=${encodeURIComponent(id)}`} className="button button-primary">带着任务去试玩 <ArrowRight size={17}/></Link><Link href={`/quiz/?edit=${encodeURIComponent(id)}`} className="button button-secondary"><SlidersHorizontal size={16}/> 修改偏好</Link><button className="button button-secondary" disabled={busy} onClick={()=>void exportCard()}><Download size={16}/> {busy?"正在生成图片…":"下载分享卡"}</button></div>
    <p className="notice">报告和试玩反馈仅保存在此浏览器，不会上传。清除站点数据或更换浏览器后无法自动找回；可以下载分享卡留存。</p>
    {error&&<p className="error-message" role="alert">{error}</p>}<div className="recommendation-grid">{report.result.recommendations.map((rec,index)=>{const a=report.agents.find(item=>item.id===rec.agentId);if(!a)return null;return <article className={`recommendation-card ${index===0?"recommendation-best":""}`} key={a.id}><div className="recommendation-card-top"><span>{kindLabels[rec.kind]}</span><span className="mono">0{index+1}</span></div><AgentGlyph id={a.id} role={a.role} name={a.name} large/><div className="recommendation-body"><span className="role-label">{roleLabels[a.role]}</span><h2>{a.name}<small>{a.enName}</small></h2><p className="agent-tagline">{a.tagline}</p><div className="why-heading"><Check size={14}/> 为什么值得一试</div><ul className="reason-list">{rec.reasons.map((reason,i)=><li key={i}>{reason.text}</li>)}</ul><div className="tradeoff"><span>也许需要适应</span><p>{rec.tradeoff}</p></div><details className="agent-details"><summary>技能风格与三局任务</summary><p>{a.description}</p><ol>{a.tryoutTasks.map(task=><li key={task}>{task}</li>)}</ol><a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-link">官方角色资料 <ArrowUpRight size={13}/></a></details></div></article>;})}</div>
    {report.result.recommendations.length<3&&<p className="notice">符合当前条件的候选不足三种，我们保留了有依据的推荐。你可以调整练习或沟通意愿再看看。</p>}
    <ProfileCharts key={id} report={report}/>
    <ArtShareCard key={id} report={report} onDownload={()=>void exportCard()} busy={busy}/>
    {notice&&<p className="notice" role="status">{notice}</p>}
    <p className="chart-note">分享卡不包含逐题答案或试玩反馈。报告网址仅供此浏览器打开；把下载的图片发给朋友即可分享。</p>
    <div className="report-footnote"><p>这份报告生成时比较了 {report.result.coverageCount} 名候选特工。画像数值由维护者根据玩法设计，不代表官方评级或心理学结论。</p><Link href="/method" className="text-link">查看题目设计、版本与局限 <ArrowUpRight size={14}/></Link><span className="mono tiny-label">Q {report.result.versions.questionnaire} / R {report.result.versions.ruleset} / A {report.result.versions.agents}</span></div>
  </div>;
}
