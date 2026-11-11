"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Save } from "lucide-react";
import type { FeedbackRecord, ReportSnapshot } from "@/lib/domain";
import { getLatestAssessmentId, getLocalAssessment, getLocalFeedback, saveLocalFeedback } from "@/lib/browser-storage";
import { RoleIcon } from "./agent-glyph";

interface TryoutData { id:string; report:ReportSnapshot; feedback:FeedbackRecord[] }
export function TryoutClient() {
  const requestedId=useSearchParams().get("id");
  const [data,setData]=useState<TryoutData|null>(null);const[error,setError]=useState("");
  const[agentId,setAgentId]=useState("");const[round,setRound]=useState(1);const[enjoyment,setEnjoyment]=useState(3);const[burden,setBurden]=useState(3);const[wantsContinue,setWantsContinue]=useState(true);const[notes,setNotes]=useState("");const[busy,setBusy]=useState(false);const[notice,setNotice]=useState("");
  useEffect(()=>{
    setData(null);setError("");setNotice("");
    try{
      const id=requestedId||getLatestAssessmentId();
      if(!id)throw new Error("此浏览器中还没有报告。请先完成一次探索，再记录试玩感受。");
      const assessment=getLocalAssessment(id);
      if(!assessment)throw new Error("此浏览器中找不到这份报告。试玩记录与报告仅保存在原来的浏览器中。");
      setData({id:assessment.id,report:assessment.report,feedback:getLocalFeedback(assessment.id)});
      setAgentId(assessment.report.result.recommendations[0]?.agentId??"");
      setRound(1);
    }catch(e){setError(e instanceof Error?e.message:"试玩任务暂时无法打开。");}
  },[requestedId]);
  useEffect(()=>{const saved=data?.feedback.find(f=>f.agentId===agentId&&f.round===round);setEnjoyment(saved?.enjoyment??3);setBurden(saved?.burden??3);setWantsContinue(saved?.wantsContinue??true);setNotes(saved?.notes??"");},[agentId,round,data?.feedback]);
  useEffect(()=>{setNotice("");},[agentId,round]);
  function save(){
    if(!data)return;
    setBusy(true);setError("");setNotice("");
    try{
      const feedback=saveLocalFeedback(data.id,{agentId,round,enjoyment,burden,wantsContinue,notes});
      setData(old=>old?{...old,feedback:[...old.feedback.filter(f=>!(f.agentId===agentId&&f.round===round)),feedback]}:old);
      setNotice(`第 ${round} 局记录已保存到此浏览器。`);
    }catch(e){setError(e instanceof Error?e.message:"记录保存失败，请重试。");}
    finally{setBusy(false);}
  }
  if(!data)return <div className="empty-state section-shell">{error?<><h1>暂时无法读取试玩任务。</h1><p role="alert">{error}</p><Link className="button button-primary" href="/quiz">重新探索</Link></>:<div className="page-loading" role="status"><span className="loading-orbit"/><p>正在准备你的试玩任务…</p></div>}</div>;
  const id=data.id;
  const agent=data.report.agents.find(a=>a.id===agentId);const history=data.feedback.filter(f=>f.agentId===agentId).sort((a,b)=>a.round-b.round);
  return <div className="section-shell tryout-page"><Link href={`/results/?id=${encodeURIComponent(id)}`} className="text-link"><ArrowLeft size={15}/> 返回推荐报告</Link><div className="page-intro"><div className="eyebrow">LET THE EXPERIENCE DECIDE</div><h1>给一种打法，<span className="text-accent">三局机会。</span></h1><p>不用急着看输赢。先观察：这份职责，是否让你觉得有趣？</p></div>
    <p className="notice">试玩记录仅保存在此浏览器，不会上传。更换浏览器或清除站点数据后无法自动恢复。</p>
    <div className="comparison-tabs tryout-tabs" role="group" aria-label="选择试玩特工">{data.report.agents.map(a=><button key={a.id} aria-pressed={a.id===agentId} className={a.id===agentId?"active":""} onClick={()=>setAgentId(a.id)}><RoleIcon role={a.role} size={16}/>{a.name}</button>)}</div>
    {agent&&<div className="tryout-layout"><section className="content-panel"><div className="panel-heading"><span className="eyebrow">YOUR THREE-ROUND PLAN</span><ClipboardCheck size={20}/></div><h2>{agent.name} · 观察任务</h2><ol className="task-list">{agent.tryoutTasks.map((task,i)=><li key={task} className={i+1===round?"current":""}><span className="task-index">0{i+1}</span><div><h3>第 {i+1} 局{history.some(f=>f.round===i+1)&&<Check size={15}/>}</h3><p>{task}</p></div></li>)}</ol><p className="chart-note">三局只是一次体验记录，不足以证明某个角色永久适合你。</p></section><section className="content-panel feedback-form"><div className="panel-heading"><span className="eyebrow">ROUND NOTES</span><span className="tiny-label">此浏览器保存</span></div><h2>记下真实感受</h2><div className="field-group"><label htmlFor="round-select">记录哪一局？</label><select id="round-select" value={round} onChange={e=>setRound(Number(e.target.value))}>{[1,2,3].map(n=><option key={n} value={n}>第 {n} 局{history.some(f=>f.round===n)?" · 已记录，可更新":""}</option>)}</select></div>
      <div className="field-group"><label htmlFor="enjoyment">职责乐趣 <output>{enjoyment}/5</output></label><input type="range" id="enjoyment" min={1} max={5} value={enjoyment} onChange={e=>setEnjoyment(Number(e.target.value))}/><div className="preference-ends"><span>不太喜欢</span><span>很享受</span></div></div>
      <div className="field-group"><label htmlFor="burden">操作负担 <output>{burden}/5</output></label><input type="range" id="burden" min={1} max={5} value={burden} onChange={e=>setBurden(Number(e.target.value))}/><div className="preference-ends"><span>轻松自然</span><span>忙不过来</span></div></div>
      <fieldset className="field-group"><legend>还想继续练吗？</legend><div className="continue-options"><button type="button" aria-pressed={wantsContinue} className={`button button-secondary ${wantsContinue?"selected":""}`} onClick={()=>setWantsContinue(true)}>想再来一局</button><button type="button" aria-pressed={!wantsContinue} className={`button button-secondary ${!wantsContinue?"selected":""}`} onClick={()=>setWantsContinue(false)}>想试试其他角色</button></div></fieldset><div className="field-group"><label htmlFor="notes">一句话感受 <span className="text-muted">选填</span></label><textarea id="notes" maxLength={500} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="哪一刻最有趣？哪里让你觉得负担大？"/></div>
      {error&&<p role="alert" className="error-message">{error}</p>}{notice&&<p role="status" className="success-message">{notice}</p>}<button className="button button-primary" disabled={busy} onClick={()=>void save()}><Save size={16}/>{busy?"正在保存…":"保存本局记录"}</button></section></div>}
    <section className="feedback-history"><div className="section-heading"><h2>你的试玩足迹</h2><span className="tiny-label">先收集感受，再决定是否继续</span></div>{history.length?<div className="history-grid">{history.map((f:FeedbackRecord)=><article className="method-card" key={f.round}><span className="eyebrow">ROUND 0{f.round}</span><h3>{f.wantsContinue?"还想继续":"想换种打法"}</h3><p>职责乐趣 {f.enjoyment}/5 · 操作负担 {f.burden}/5</p>{f.notes&&<p className="history-note">{f.notes}</p>}</article>)}</div>:<p className="notice">还没有记录。完成一局后，再来填写就好。</p>}<p className="chart-note">反馈供你个人回顾，不会上传给维护者，也不会自动修改推荐规则或已经保存的报告。</p></section><Link href={`/results/?id=${encodeURIComponent(id)}`} className="button button-secondary">回到报告，看看另一种可能 <ArrowRight size={16}/></Link>
  </div>;
}
