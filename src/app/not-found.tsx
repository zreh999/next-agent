import Link from "next/link";
export default function NotFound(){return <div className="empty-state section-shell"><span className="eyebrow">404 / OFF THE MAP</span><h1>这条路线暂时走不通。</h1><p>页面可能已移动。你可以从首页重新开始，或查看此浏览器保存的报告。</p><Link className="button button-primary" href="/">回到起点</Link><Link className="text-link" href="/results/">查看本机报告</Link></div>;}
