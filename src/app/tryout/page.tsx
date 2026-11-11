import type { Metadata } from "next";
import { Suspense } from "react";
import { TryoutClient } from "@/components/tryout-client";

export const metadata: Metadata = { title: "三局试玩记录", robots: { index: false, follow: false } };

export default function TryoutPage() {
  return <Suspense fallback={<div className="page-loading" role="status"><span className="loading-orbit" /><p>正在准备你的试玩任务…</p></div>}><TryoutClient /></Suspense>;
}
