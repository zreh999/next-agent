"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { AgentGlyph, RoleIcon } from "./agent-glyph";
import { roleLabels, type AgentCatalog, type AgentRole } from "@/lib/domain";

const roles: AgentRole[] = ["duelist", "initiator", "controller", "sentinel"];
function searchKey(text: string) { return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); }
export function AgentLibrary({ catalog }: { catalog: AgentCatalog }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AgentRole | "all">("all");
  const filtered = useMemo(() => catalog.agents.filter(a => (role === "all" || a.role === role) && searchKey(`${a.name}${a.enName}${a.id}`).includes(searchKey(query))), [catalog, role, query]);
  return <>
    <div className="library-controls"><label className="library-search"><Search size={17}/><span className="sr-only">搜索特工</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索中文名或英文名" aria-label="搜索特工"/></label><div className="library-role-filters" role="group" aria-label="按特工职责筛选"><button aria-pressed={role === "all"} onClick={() => setRole("all")}>全部 <small>{catalog.agents.length}</small></button>{roles.map(item => <button key={item} aria-pressed={role === item} onClick={() => setRole(item)}><RoleIcon role={item} size={14}/>{roleLabels[item]} <small>{catalog.agents.filter(a => a.role === item).length}</small></button>)}</div></div>
    <p className="library-count small-text text-muted" role="status">正在显示 {filtered.length} / {catalog.agents.length} 名特工 · 所有角色都参与推荐</p>
    <div className="agent-library-grid">{filtered.map(agent => <article className="catalog-card" key={agent.id}>
      <AgentGlyph id={agent.id} role={agent.role} name={agent.name}/>
      <div className="catalog-card-body"><span className="role-label"><RoleIcon role={agent.role} size={12}/>{roleLabels[agent.role]}</span><h2>{agent.name}{agent.name !== agent.enName && <small>{agent.enName}</small>}</h2><p className="agent-tagline">{agent.tagline}</p><p className="catalog-description">{agent.description}</p><details className="agent-details"><summary>看看职责与试玩任务</summary><ul>{agent.strengths.map(item => <li key={item}>{item}</li>)}</ul><div className="tradeoff"><span>可能需要适应</span><p>{agent.tradeoff}</p></div><ol>{agent.tryoutTasks.map(task => <li key={task}>{task}</li>)}</ol><a className="text-link" href={agent.sourceUrl} target="_blank" rel="noreferrer">官方特工资料 <ArrowUpRight size={13}/></a></details></div>
    </article>)}</div>
    {filtered.length === 0 && <div className="notice">没有找到对应角色。可以换个名字，或查看其他职责。<button className="text-link" onClick={() => { setQuery(""); setRole("all"); }}>显示全部特工</button></div>}
    <div className="method-cta"><p>名字和职责只是入口。看看哪种打法，会与你产生共鸣。</p><Link href="/quiz" className="button button-primary">寻找我的本命 <ArrowRight size={17}/></Link></div>
  </>;
}
