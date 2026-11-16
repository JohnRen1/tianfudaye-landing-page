import type { Metadata } from "next";
import { QuizApp } from "@/components/folk-quiz/quiz-app";

export const metadata: Metadata = {
  title: "民俗知识挑战",
  description: "民俗知识挑战",
};

export default function QaFrontPage() {
  return <QuizApp />;
}
