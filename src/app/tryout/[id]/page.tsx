import type { Metadata } from "next";
import { TryoutClient } from "@/components/tryout-client";
export const metadata: Metadata={title:"三局试玩记录",robots:{index:false,follow:false}};
export default async function TryoutPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <TryoutClient id={id}/>;}
