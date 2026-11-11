"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state section-shell"><span className="eyebrow">LET'S TRY AGAIN</span><h1>页面暂时没有加载好。</h1><p>你的浏览器草稿仍会保留，可以重试。</p><button className="button button-primary" onClick={reset}>重新加载</button></div>;}
