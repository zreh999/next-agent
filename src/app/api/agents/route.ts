import { NextResponse } from "next/server";
import { catalog } from "@/lib/content";
export async function GET() { return NextResponse.json(catalog); }
