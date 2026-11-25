import type { Metadata } from "next";
import { LedgerApp } from "@/components/folk-quiz/ledger-app";

export const metadata: Metadata = {
  title: "参赛台账",
  description: "江山市图书馆阅读挑战赛参赛台账",
};

export default function QaFrontLedgerPage() {
  return <LedgerApp />;
}
