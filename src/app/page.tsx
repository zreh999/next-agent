import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, SlidersHorizontal, GitBranch, Compass } from "lucide-react";
import { catalog, questionnaire } from "@/lib/content";
import { roleLabels } from "@/lib/domain";
import { AgentGlyph } from "@/components/agent-glyph";

function SignalFigure() {
  return <div className="signal-panel"><div className="signal-topline"><span><i className="status-dot"/> PLAYSTYLE SIGNAL</span><span>样例画像 / PREVIEW</span></div>
    <svg viewBox="0 0 440 340" role="img" aria-label="示意玩法画像：五个维度的探索信号，并非实际测评结果">
      <defs><linearGradient id="signal-fill" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#a5e9d8" stopOpacity=".02"/><stop offset="1" stopColor="#a5e9d8" stopOpacity=".28"/></linearGradient></defs>
      {[1,.75,.5,.25].map(s=><polygon key={s} points={`220,${170-126*s} ${220+120*s},${170-39*s} ${220+74*s},${170+102*s} ${220-74*s},${170+102*s} ${220-120*s},${170-39*s}`} fill="none" stroke="#52616c" strokeOpacity=".35"/>)}
      <path d="M220 44V170L340 131M220 170L294 272M220 170L146 272M220 170L100 131" stroke="#52616c" strokeOpacity=".35" fill="none"/>
      <polygon points="220,91 318,138 266,234 164,247 177,156" stroke="#a5e9d8" strokeWidth="2" fill="url(#signal-fill)"/>
      {[[220,91],[318,138],[266,234],[164,247],[177,156]].map(([x,y])=><circle key={x} cx={x} cy={y} r="4" fill="#a5e9d8"/>)}
      <g fill="#b9c5cc" fontSize="12" textAnchor="middle"><text x="220" y="23">创造机会</text><text x="380" y="132">信息获取</text><text x="315" y="303">提前布置</text><text x="126" y="303">临场变化</text><text x="53" y="132">团队协作</text></g><circle cx="220" cy="170" r="3" fill="#f0f0e6"/>
    </svg>
    <div className="signal-caption"><span className="tiny-label">每个选择，都有自己的频率。</span><p>听见你的偏好，找到角色的回响。</p><span className="signal-corner">05 DIMENSIONS<span>原创情境 · 公开规则</span></span></div>
  </div>;
}
export default function HomePage() {
  const preview = ["jett", "sova", "omen", "killjoy"].map(id => catalog.agents.find(a=>a.id===id)!).filter(Boolean);
  return <div className="home-wrap">
    <section className="hero section-shell"><div className="hero-copy"><div className="eyebrow"><span className="tiny-dash"/> FIND YOUR RESONANCE</div><h1>找到与你<br/><span className="text-accent">同频的特工。</span></h1><p className="hero-description">有些角色让你赢一局，<br className="desktop-break"/>有些打法让你想一直玩下去。</p><p className="hero-subdescription">走进 {questionnaire.questions.length} 段原创情境，听见自己的选择。<br/>借心理学的视角，探索属于你的本命回响。</p><Link href="/quiz" className="button button-primary hero-button">寻找我的本命 <ArrowRight size={20}/></Link><div className="hero-checks"><span><Check size={13}/> 无需注册</span><span><Check size={13}/> 全角色覆盖</span><span><Check size={13}/> 可解释推荐</span></div></div><SignalFigure/></section>
    <div className="fact-strip section-shell"><div><span className="fact-number">{String(questionnaire.questions.length).padStart(2,"0")}</span><span>幕原创情境<small>在故事里，看见自己的选择</small></span></div><div><span className="fact-number">05</span><span>项玩法偏好<small>心理学启发，非能力评级</small></span></div><div><span className="fact-number">{String(catalog.agents.length).padStart(2,"0")}</span><span>名官网完整特工<small>全角色，一起寻找同频</small></span></div><div><span className="fact-number">03</span><span>局试玩观察<small>让真实体验验证共鸣</small></span></div></div>
    <section className="section-shell section-block"><div className="section-heading"><div><div className="eyebrow">MORE THAN A RESULT</div><h2>给你一个选择，<span className="text-muted">也给你选择的理由。</span></h2></div><Link href="/method" className="text-link">看看推荐方法 <ArrowUpRight size={15}/></Link></div><div className="feature-grid">{[
      {n:"01",Icon:Compass,title:"在故事里，听见自己",body:"最后一回合、陌生地图、队友的一句邀请。你如何面对未知、选择机会、建立默契？"},
      {n:"02",Icon:SlidersHorizontal,title:"读懂推荐与取舍",body:"不止一个名字。了解三位候选各自的契合点，以及你可能不喜欢的部分。"},
      {n:"03",Icon:GitBranch,title:"把结果交给实战",body:"带上三局试玩任务，记录乐趣和负担。是否喜欢，由你的体验来决定。"}
    ].map(({n,Icon,title,body})=><article className="feature-card" key={n}><div className="feature-card-top"><Icon size={22}/><span>{n}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="section-shell section-block agent-preview-section"><div className="section-heading"><div><div className="eyebrow">DIFFERENT AGENTS. YOUR FREQUENCY.</div><h2>一种默契，<span className="text-muted">可以有不同的名字。</span></h2></div><Link className="text-link" href="/agents">查看全部 {catalog.agents.length} 名特工 <ArrowUpRight size={15}/></Link></div><div className="preview-agents">{preview.map(a=><article className="preview-agent" key={a.id}><AgentGlyph id={a.id} role={a.role} name={a.name}/><div><span className="role-label">{roleLabels[a.role]}</span><h3>{a.name}<span>{a.enName}</span></h3><p>{a.tagline}</p></div></article>)}</div></section>
    <section className="section-shell final-cta"><div><span className="eyebrow">THE RESONANCE STARTS WITH YOU</span><h2>本命不是被指定的名字。<br/>是你愿意反复回来的感觉。</h2></div><Link href="/quiz" className="button button-primary">开始寻找同频 <ArrowRight size={19}/></Link></section>
  </div>;
}
