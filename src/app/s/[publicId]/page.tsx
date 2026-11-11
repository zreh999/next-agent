import type { Metadata } from "next";
import { ReportClient } from "@/components/report-client";
export const metadata: Metadata={title:"分享的玩法报告",robots:{index:false,follow:false}};
export default async function SharePage({params}:{params:Promise<{publicId:string}>}){const{publicId}=await params;return <ReportClient id={publicId} isPublic/>;}
