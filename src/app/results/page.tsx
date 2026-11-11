import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportClient } from "@/components/report-client";

export const metadata: Metadata = { title: "你的玩法报告", robots: { index: false, follow: false } };

export default function ResultsPage() {
  return <Suspense fallback={<div className="page-loading" role="status"><span className="loading-orbit" /><p>正在读取你的玩法信号…</p></div>}><ReportClient /></Suspense>;
}
