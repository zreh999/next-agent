import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight, GitBranch as Github } from "lucide-react";
import { site } from "@/lib/site";
import { questionnaire } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: `${questionnaire.questions.length}段心理学启发的原创情境，探索与你同频的无畏契约特工。全角色推荐、可解释报告、三局试玩任务。`,
  robots: { index: true, follow: true }
};
export const viewport: Viewport = { themeColor: "#0b1117" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const github = process.env.NEXT_PUBLIC_GITHUB_URL;
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label={`${site.name} 首页`}><span className="brand-mark"><i/><i/><i/></span><span>{site.name}<small>AGENT RESONANCE</small></span><span className="version-tag">BETA {site.version}</span></Link>
      <nav aria-label="主导航"><Link href="/agents">特工图鉴</Link><Link href="/method">推荐方法</Link><Link href="/results/" className="source-link">本机报告</Link>{github ? <a href={github} target="_blank" rel="noreferrer" className="source-link"><Github size={16}/> 开源项目 <ArrowUpRight size={13}/></a> : <Link href="/method#open-source" className="source-link"><Github size={16}/> 开源计划</Link>}</nav>
    </div></header>
    <main>{children}</main>
    <footer className="site-footer"><div><Link href="/" className="footer-wordmark">AGENT RESONANCE<span> / </span>{site.name}</Link><p>名字之外，找到同频。</p><Link href="/results/" className="text-link">查看本机最近报告 <ArrowUpRight size={12}/></Link></div><div className="footer-note"><span>独立粉丝项目 · 非官方推荐</span><p>VALORANT 及角色名称属于 Riot Games。此工具用于玩法探索，不评估人格、能力或胜率。</p><p>答案、报告和试玩记录仅保存在此浏览器。</p><Link href="/method">方法、素材与使用说明 <ArrowUpRight size={12}/></Link></div></footer>
  </body></html>;
}
