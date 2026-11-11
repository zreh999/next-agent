"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, RotateCcw, LockKeyhole, Sparkles } from "lucide-react";
import type { AgentProfile, AssessmentInput, Preferences, Questionnaire } from "@/lib/domain";
import { roleLabels } from "@/lib/domain";
import { preferencesSchema } from "@/lib/validation";

const DRAFT_KEY = "next-agent-draft-v1";
const defaults: Preferences = { experience: "new", practice: "balanced", communication: "flexible", excludedAgentIds: [] };
const settings = [
  { key: "experience" as const, title: "你和这款游戏，有多熟？", hint: "仅作背景信息，不把经验当成性格。", options: [{id:"new",name:"刚刚入场",description:"还在认识特工和地图"},{id:"some",name:"已经玩过一些",description:"有熟悉的打法，想再探索"},{id:"experienced",name:"老朋友了",description:"想换个角色或试试新职责"}] },
  { key: "practice" as const, title: "你愿意为新特工，投入多少练习？", hint: "影响技能管理负担的推荐取舍。", options: [{id:"light",name:"轻装上阵",description:"希望少些准备，尽快上手"},{id:"balanced",name:"适度练习",description:"愿意花一点时间熟悉技能"},{id:"dedicated",name:"认真钻研",description:"复杂技巧和部署也愿意学"}] },
  { key: "communication" as const, title: "对局中，你更喜欢怎样沟通？", hint: "这是你的选择，不是社交能力评级。", options: [{id:"quiet",name:"少说一些",description:"更喜欢标记和简短信息"},{id:"flexible",name:"需要时交流",description:"关键时刻会配合队伍"},{id:"active",name:"主动协调",description:"愿意报计划、沟通时机"}] }
];
export function QuizClient({ questionnaire, agents }: { questionnaire: Questionnaire; agents: AgentProfile[] }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [step, setStep] = useState(-1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftNote, setDraftNote] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const edit = new URLSearchParams(window.location.search).get("edit");
        if (edit) {
          const response = await fetch(`/api/assessments/${encodeURIComponent(edit)}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          const input = data.input as AssessmentInput;
          if (input.questionnaireVersion !== questionnaire.version) throw new Error("原报告题库已更新，请重新探索。");
          if (!cancelled) { setPreferences(preferencesSchema.parse(input.preferences)); setAnswers(Object.fromEntries(input.answers.map(a => [a.questionId,a.optionId]))); setDraftNote("已载入原报告的回答。修改后会创建新报告，旧报告保持不变。"); }
        } else {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) {
            const draft = JSON.parse(saved);
            if (draft.version === questionnaire.version && typeof draft.answers === "object" && draft.answers !== null) {
              const safe: Record<string,string> = {};
              for (const q of questionnaire.questions) if (q.options.some(o => o.id === draft.answers[q.id])) safe[q.id] = draft.answers[q.id];
              if (!cancelled) { setPreferences(preferencesSchema.parse(draft.preferences)); setAnswers(safe); if (Object.keys(safe).length) setDraftNote("找到了此浏览器中的草稿，可以继续，也可以重新开始。"); }
            }
          }
        }
      } catch (e) { if (!cancelled) setDraftNote(e instanceof Error ? e.message : "旧草稿无法恢复，已为你开启新的探索。"); }
      finally { if (!cancelled) setReady(true); }
    }
    void restore(); return () => { cancelled = true; };
  }, [questionnaire]);
  useEffect(() => { if (ready) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: questionnaire.version, preferences, answers })); } catch { /* storage is optional */ } } }, [ready, preferences, answers, questionnaire.version]);
  const answered = Object.keys(answers).length;
  const current = questionnaire.questions[step];
  function move(index: number) { setError(""); setStep(index); window.scrollTo({top:0,behavior:"instant"}); }
  async function submit() {
    setBusy(true); setError("");
    try {
      const input: AssessmentInput = { questionnaireVersion: questionnaire.version, preferences, answers: questionnaire.questions.map(q => ({ questionId:q.id, optionId:answers[q.id] })) };
      const response = await fetch("/api/assessments", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(input) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "保存失败，请重试。");
      try { localStorage.removeItem(DRAFT_KEY); localStorage.setItem("next-agent-last-result", data.id); } catch { /* storage is optional */ }
      router.push(`/results/${data.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "连接暂时中断，请再试一次。"); setBusy(false); }
  }
  if (!ready) return <div className="page-loading" role="status"><span className="loading-orbit"/><p>正在准备你的探索…</p></div>;
  if (step < 0) return <div className="section-shell setup-page"><div className="page-intro"><div className="eyebrow">BEFORE THE FIRST ROUND</div><h1>先选一个，<span className="text-accent">舒服的起点。</span></h1><p>我们会把你的意愿放进推荐里。没有更好的选项，只有更适合现在的你。</p></div>
    {draftNote && <div className="notice"><span>{draftNote}</span>{answered>0&&<button className="text-link" onClick={()=>{setAnswers({});setDraftNote("");setPreferences(defaults);}}><RotateCcw size={13}/> 清除草稿</button>}</div>}
    {settings.map((setting,index)=><fieldset className="setting-section" key={setting.key}><legend><span className="setting-number">0{index+1}</span>{setting.title}</legend><p>{setting.hint}</p><div className="setting-grid">{setting.options.map(o=><button type="button" key={o.id} className={`setting-option ${preferences[setting.key]===o.id?"selected":""}`} aria-pressed={preferences[setting.key]===o.id} onClick={()=>setPreferences(p=>({...p,[setting.key]:o.id}))}><span>{o.name}{preferences[setting.key]===o.id&&<Check size={15}/>}</span><small>{o.description}</small></button>)}</div></fieldset>)}
    <details className="exclude-details"><summary>有不想被推荐的特工？<span>可选</span></summary><div className="exclude-grid">{agents.map(a=><label key={a.id}><input type="checkbox" checked={preferences.excludedAgentIds.includes(a.id)} onChange={e=>setPreferences(p=>({...p,excludedAgentIds:e.target.checked?[...p.excludedAgentIds,a.id]:p.excludedAgentIds.filter(id=>id!==a.id)}))}/>{a.name}<small>{roleLabels[a.role]}</small></label>)}</div></details>
    <div className="setup-bottom"><span><LockKeyhole size={14}/> 草稿保存在此浏览器</span><button className="button button-primary" onClick={()=>{const missing=questionnaire.questions.findIndex(q=>!answers[q.id]);move(missing<0?0:missing);}}>进入情境 <ArrowRight size={18}/></button></div>
  </div>;
  return <div className="quiz-shell section-shell"><div className="quiz-top"><button className="text-link" onClick={()=>move(step-1)} disabled={busy}><ArrowLeft size={16}/>{step===0?"基础偏好":"上一题"}</button><span className="mono small-text">QUESTION {String(step+1).padStart(2,"0")} <span className="text-muted">/ {questionnaire.questions.length}</span></span></div><div className="quiz-progress" role="progressbar" aria-label="答题进度" aria-valuenow={step+1} aria-valuemin={0} aria-valuemax={questionnaire.questions.length}><span style={{width:`${(step+1)/questionnaire.questions.length*100}%`}}/></div>
    <div className="question-stage" key={current.id}><span className="eyebrow">这一幕里，哪种选择更像你？</span>{current.context&&<p className="question-context">{current.context}</p>}<h1>{current.prompt}</h1><div className="answer-list">{current.options.map((o,i)=><button type="button" className={`answer-option ${answers[current.id]===o.id?"selected":""}`} aria-pressed={answers[current.id]===o.id} key={o.id} disabled={busy} onClick={()=>setAnswers(a=>({...a,[current.id]:o.id}))}><span className="answer-letter">{"ABCD"[i]??i+1}</span><span>{o.label}</span><span className="answer-check">{answers[current.id]===o.id&&<Check size={17}/>}</span></button>)}</div></div>
    {error&&<p className="error-message" role="alert">{error}</p>}<div className="quiz-bottom"><span className="small-text text-muted">选你更想体验的方式，不用找最正确的战术答案。</span><button className="button button-primary" disabled={!answers[current.id]||busy} onClick={()=>step===questionnaire.questions.length-1?void submit():move(step+1)}>{busy?"正在整理报告…":step===questionnaire.questions.length-1?"生成我的报告":"下一题"}{step===questionnaire.questions.length-1?<Sparkles size={17}/>:<ArrowRight size={18}/>}</button></div>
  </div>;
}
