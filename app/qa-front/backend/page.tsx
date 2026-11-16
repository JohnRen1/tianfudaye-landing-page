import type { Metadata } from "next";
import { LedgerApp } from "@/components/folk-quiz/ledger-app";

export const metadata: Metadata = {
  title: "参赛台账",
  description: "民俗知识挑战参赛台账",
};

export default function QaFrontLedgerPage() {
  return <LedgerApp />;
}
