import type { Metadata } from "next";
import { QuizApp } from "@/components/folk-quiz/quiz-app";

export const metadata: Metadata = {
  title: "江山市图书馆阅读挑战赛",
  description: "江山市图书馆阅读挑战赛",
};

export default function QaFrontPage() {
  return <QuizApp />;
}
