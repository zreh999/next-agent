import { NextResponse } from "next/server";
import { site } from "@/lib/site";
export async function GET() { return NextResponse.json({ ok: true, version: site.releaseVersion, storage: process.env.DATABASE_URL ? "postgresql" : "file-demo" }); }
