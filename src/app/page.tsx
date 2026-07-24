import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing-experience";

export const metadata: Metadata = {
  title: "TraceScope | LLM Observability for Production AI",
  description:
    "Animated product landing page for TraceScope, a working LLM observability console for traces, evals, RAG, cost, latency, and alerts.",
};

export default function Home() {
  return <LandingExperience />;
}
