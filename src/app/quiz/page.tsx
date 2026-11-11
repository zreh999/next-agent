import type { Metadata } from "next";
import { catalog, questionnaire } from "@/lib/content";
import { QuizClient } from "@/components/quiz-client";
export const metadata: Metadata = { title: "情境探索" };
export default function QuizPage() { return <QuizClient questionnaire={questionnaire} agents={catalog.agents}/>; }
