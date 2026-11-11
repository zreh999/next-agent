import type { Metadata } from "next";
import { ReportClient } from "@/components/report-client";
export const metadata: Metadata={title:"你的玩法报告",robots:{index:false,follow:false}};
export default async function ResultsPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ReportClient id={id}/>;}
