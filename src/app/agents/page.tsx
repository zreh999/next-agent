import type { Metadata } from "next";
import { catalog } from "@/lib/content";
import { site } from "@/lib/site";
import { AgentLibrary } from "@/components/agent-library";
export const metadata: Metadata = { title: "完整特工图鉴" };
export default function AgentsPage() {
  return <div className="section-shell agent-library-page"><div className="page-intro"><div className="eyebrow">EVERY AGENT. A DIFFERENT RESONANCE.</div><h1>每个名字，<br/><span className="text-accent">都有一种回响。</span></h1><p>覆盖官网截至 {site.rosterReviewedAt} 列出的全部 {catalog.agents.length} 名特工。<br/>先认识他们的职责，再寻找与你同频的可能。</p></div><AgentLibrary catalog={catalog}/><p className="chart-note">中文名依据国服官方特工名录，职责与机制参考各角色官方页面；玩法画像和试玩建议由维护者原创设计。</p></div>;
}
