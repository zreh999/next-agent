"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Image as ImageIcon } from "lucide-react";
import type { AgentProfile, ReportSnapshot } from "@/lib/domain";
import { kindLabels, roleLabels } from "@/lib/domain";
import { getAgentMedia } from "@/lib/agent-media";
import { AgentGlyph } from "./agent-glyph";
import { site } from "@/lib/site";

interface ArtShareCardProps { report: ReportSnapshot; onDownload: () => void; busy: boolean }

function Portrait({ agent, className = "" }: { agent: AgentProfile; className?: string }) {
  const url = getAgentMedia(agent.id)?.portraitUrl;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  return <div className={"art-portrait " + className}>
    {url && !failed
      ? <img src={url} alt={agent.name + "角色立绘"} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <AgentGlyph id={agent.id} role={agent.role} name={agent.name} large />}
  </div>;
}

export function ArtShareCard({ report, onDownload, busy }: ArtShareCardProps) {
  const ordered = report.result.recommendations.flatMap(recommendation => {
    const agent = report.agents.find(item => item.id === recommendation.agentId);
    return agent ? [{ agent, kind: recommendation.kind }] : [];
  });
  const primary = ordered[0]?.agent;
  if (!primary) return null;
  const media = getAgentMedia(primary.id);
  const quote = media?.quote;
  const accent = media?.accent ?? "#a5e9d8";
  const palette = { "--art-accent": /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#a5e9d8" } as CSSProperties;
  return <section className="art-share-section" aria-label="艺术分享卡" style={palette}>
    <div className="art-share-intro"><div><span className="eyebrow">MAKE IT YOUR PLAYER CARD</span><h2>这一局，想和谁同频？</h2></div>
      <p>把下一位想练的特工，做成一张属于你的海报。</p></div>
    <div className="art-share-layout">
      <div className="art-poster" aria-label={primary.name + "艺术海报预览"}>
        <div className="art-poster-grid" />
        <Portrait key={primary.id} agent={primary} className="art-poster-hero" />
        <div className="art-poster-shade" />
        <div className="art-poster-brand"><strong>{site.name}</strong><span>AGENT RESONANCE / NO. 01</span></div>
        <div className="art-poster-title"><span>YOUR NEXT MAIN</span><small>{kindLabels[ordered[0].kind]} / {roleLabels[primary.role]}</small>
          <strong>{primary.name}</strong><b>{primary.enName.toUpperCase()}</b><em>玩法印象</em><p>{primary.tagline}</p></div>
        {quote ? <blockquote className="art-poster-quote"><small>{quote.translation ? "角色台词｜中文译意" : "角色台词｜英文原句"}</small>
          <p>{quote.translation ?? quote.text}</p>{quote.translation && <span lang="en">{quote.text}</span>}</blockquote>
          : <div className="art-poster-caption">不是替你决定本命。<br />是给下一局一个新选择。</div>}
        <div className="art-poster-alternatives">{ordered.slice(1, 3).map(item =>
          <div className="art-poster-mini" key={item.agent.id}><Portrait agent={item.agent} /><div><small>{kindLabels[item.kind]}</small>
            <strong>{item.agent.name}</strong><span>{item.agent.enName}</span></div></div>)}</div>
        <div className="art-poster-wave" aria-hidden="true">{Array.from({ length: 39 }, (_, index) =>
          <i key={index} style={{ height: (4 + Math.abs(Math.sin(index * .8) * Math.cos(index * .21)) * 19) + "px" }} />)}</div>
        <div className="art-poster-coordinates">{report.dimensions.map(dimension =>
          <div key={dimension.id}><span>{dimension.label}</span><i><b style={{ width: Math.max(0, Math.min(1, report.result.profile[dimension.id])) * 100 + "%" }} /></i></div>)}</div>
        <div className="art-poster-footer">玩法偏好探索 · 非人格测量 · 独立粉丝项目</div>
      </div>
      <div className="art-share-copy">
        <span className="eyebrow">PORTRAIT / COLOUR / YOUR PLAYSTYLE</span><h3>让喜欢的打法，<br />有一点自己的风格。</h3>
        <p>首推站在画面中央，另外两种可能留在一旁。角色立绘、主题色、经典台词与五维坐标，共同组成这次探索的封面。</p>
        <button type="button" className="button button-primary" disabled={busy} onClick={onDownload}>
          <ImageIcon size={17} />{busy ? "正在生成图片…" : "下载艺术分享卡"}
        </button>
        <p className="art-share-hint">1080 × 1440 PNG。只展示偏好与候选，不包含逐题答案或试玩反馈。网络或素材来源不可用时，会自动生成原创几何版本，并给出说明。</p>
        {quote && <div className="art-quote-note"><strong>一句台词，也是一种气质。</strong>
          <p>{quote.translation ? "卡片的中文为原创译意，不是官方中文配音文本；下方保留核对过的英文原句。" : "卡片保留核对过的英文短句。没有核实的角色不会补写虚构台词。"}</p>
          <a className="text-link" href={quote.sourceUrl} target="_blank" rel="noreferrer">查看{primary.name}台词出处 <ArrowUpRight size={13} /></a></div>}
        <a className="text-link art-media-source" href={media?.sourceUrl ?? primary.sourceUrl} target="_blank" rel="noreferrer">
          查看角色官方资料 <ArrowUpRight size={13} />
        </a>
        <p className="art-share-credit">立绘由 <a href="https://valorant-api.com/" target="_blank" rel="noreferrer">VALORANT-API 社区素材服务</a>托管。角色与台词属于 Riot Games；中文为项目译意，“玩法印象”为原创描述。本项目非官方推荐。</p>
      </div>
    </div>
  </section>;
}
