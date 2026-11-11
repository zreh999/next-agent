import { NextResponse } from "next/server";
import { questionnaire } from "@/lib/content";
export async function GET() { return NextResponse.json(questionnaire); }
