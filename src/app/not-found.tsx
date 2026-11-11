import Link from "next/link";
export default function NotFound(){return <div className="empty-state section-shell"><span className="eyebrow">404 / OFF THE MAP</span><h1>这条路线暂时走不通。</h1><p>页面可能已移动，或分享已经撤销。</p><Link className="button button-primary" href="/">回到起点</Link></div>;}
