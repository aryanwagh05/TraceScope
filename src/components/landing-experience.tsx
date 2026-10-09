"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Database,
  FlaskConical,
  GitCompareArrows,
  LockKeyhole,
  Radar,
  ShieldCheck,
  SplitSquareHorizontal,
} from "lucide-react";
import { useState } from "react";

const consoleAreas = [
  {
    href: "/dashboard",
    label: "Dashboard",
    detail: "Executive health across request volume, latency, cost, errors, pass rate, and risk.",
    icon: Radar,
  },
  {
    href: "/traces",
    label: "Traces",
    detail: "Request-level spans for prompts, retrieval, tools, validation, model calls, and evals.",
    icon: Activity,
  },
  {
    href: "/evals",
    label: "Evals",
    detail: "Quality gates for groundedness, citation support, schema validity, latency, and cost.",
    icon: FlaskConical,
  },
  {
    href: "/experiments",
    label: "Experiments",
    detail: "Model comparisons based on observed quality, cost, latency, and failure examples.",
    icon: GitCompareArrows,
  },
  {
    href: "/alerts",
    label: "Alerts",
    detail: "Rules that fire when hallucination risk, schema failures, latency, or retrieval quality drifts.",
    icon: Bell,
  },
  {
    href: "/datasets",
    label: "Datasets",
    detail: "Regression cases promoted from real bad traces so failures become repeatable tests.",
    icon: Database,
  },
];

const explainers = [
  {
    title: "What LLM observability means",
    body:
      "Traditional observability tells you when a request was slow or failed. LLM observability also asks why an answer was wrong: which prompt version ran, what context was retrieved, which tool call changed state, which evaluator failed, how much the call cost, and what feedback came back from the user.",
  },
  {
    title: "Why normal logs are not enough",
    body:
      "AI systems fail in softer ways than ordinary services. A response can be well formatted, fast, and still unsupported by evidence. TraceScope treats prompts, spans, retrieval chunks, evaluator notes, and feedback as one connected record so teams can debug behavior instead of chasing isolated log lines.",
  },
  {
    title: "What TraceScope covers",
    body:
      "TraceScope connects trace modeling, ingestion security, evaluation, RAG inspection, regression datasets, alert thresholds, and model tradeoffs. Each view should help an engineer move from a suspicious result to the request details that explain it.",
  },
  {
    title: "Why I am building it",
    body:
      "I started TraceScope because a prompt that works in a demo tells me very little about how it behaves later. I wanted a place to inspect the whole request, keep the evidence alongside the answer, and turn a real failure into something I can test again.",
  },
  {
    title: "How a team would use it",
    body:
      "An app posts trace payloads after each AI workflow. Engineers inspect failed traces, promote bad examples into eval datasets, run comparison experiments, tune prompts or models, and use alerts to catch drift before users report the same failure again.",
  },
];

const buildReasons = [
  "Make prompt and retrieval behavior inspectable.",
  "Turn failed AI responses into regression tests.",
  "Show cost, latency, and quality tradeoffs in one place.",
  "Keep quality, latency, and usage visible as traffic changes.",
];

export function LandingExperience() {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  return (
    <main
      className="landing-page"
      style={
        {
          "--pointer-x": `${pointer.x}%`,
          "--pointer-y": `${pointer.y}%`,
        } as React.CSSProperties
      }
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <section className="landing-hero">
        <header className="landing-nav">
          <Link href="/" className="landing-brand">
            <Radar size={29} strokeWidth={1.55} className="landing-brand-mark" aria-hidden="true" />
            <span>
              <span className="landing-brand-name">TraceScope</span>
              <span className="landing-brand-subtitle">LLM observability</span>
            </span>
          </Link>
          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#why">Why</a>
            <a href="#inside">Inside</a>
            <a href="#learn">Learn</a>
            <Link href="/dashboard">Console</Link>
          </nav>
        </header>

        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Production AI, made inspectable</p>
            <h1>TraceScope</h1>
            <p className="landing-hero-text">
              An LLM observability console that follows a request from input to
              outcome. Inspect prompts, retrieval, model calls, evaluations, cost,
              and latency in one connected trace, then turn failures into useful tests.
            </p>
            <div className="landing-actions">
              <Link href="/dashboard" className="landing-primary-action">
                Open console
                <ArrowRight size={17} />
              </Link>
              <Link href="/docs" className="landing-secondary-action">
                Integration docs
              </Link>
            </div>
          </div>

          <div className="landing-topology" aria-label="Animated trace topology preview">
            <div className="landing-scan" />
            <div className="landing-node node-input">
              <span>Input</span>
              <strong>request</strong>
            </div>
            <div className="landing-node node-retrieval">
              <span>RAG</span>
              <strong>context</strong>
            </div>
            <div className="landing-node node-model">
              <span>Model</span>
              <strong>response</strong>
            </div>
            <div className="landing-node node-eval">
              <span>Eval</span>
              <strong>quality</strong>
            </div>
            <div className="landing-node node-alert">
              <span>Alert</span>
              <strong>watch</strong>
            </div>
            <span className="landing-link link-a" />
            <span className="landing-link link-b" />
            <span className="landing-link link-c" />
            <span className="landing-link link-d" />
            <div className="landing-console-strip strip-one">
              <span>groundedness</span>
              <strong>inspect</strong>
            </div>
            <div className="landing-console-strip strip-two">
              <span>schema validity</span>
              <strong>check</strong>
            </div>
            <div className="landing-console-strip strip-three">
              <span>cost budget</span>
              <strong>review</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="landing-section landing-intro">
        <div>
          <p className="landing-eyebrow">Why this exists</p>
          <h2>AI products need observability that understands behavior, not just uptime.</h2>
        </div>
        <div className="landing-reasons">
          {buildReasons.map((reason, index) => (
            <div key={reason} className="landing-reason">
              <span>{(index + 1).toString().padStart(2, "0")}</span>
              <p>{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="inside" className="landing-section">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Inside the console</p>
          <h2>Every section maps to a real reliability workflow.</h2>
        </div>
        <div className="landing-area-grid">
          {consoleAreas.map((area) => {
            const Icon = area.icon;

            return (
              <Link key={area.href} href={area.href} className="landing-area-card">
                <Icon size={19} strokeWidth={1.8} />
                <h3>{area.label}</h3>
                <p>{area.detail}</p>
                <span>
                  Inspect
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="learn" className="landing-section landing-split">
        <div>
          <p className="landing-eyebrow">Open the topic</p>
          <h2>How the system is designed.</h2>
          <p>
            The decisions behind the traces, evaluations, and workflow, plus
            the reason I started building it.
          </p>
        </div>
        <div className="landing-accordion">
          {explainers.map((item, index) => (
            <details key={item.title} open={index === 0}>
              <summary>
                <span>{item.title}</span>
                <SplitSquareHorizontal size={17} />
              </summary>
              <p>{item.body}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-section landing-security">
        <div>
          <LockKeyhole size={22} />
          <h2>Public overview. Private telemetry.</h2>
        </div>
        <p>
          The landing page is open. The console requires a workspace password,
          and applications submit traces with separate ingestion keys.
        </p>
        <Link href="/login" className="landing-primary-action">
          Unlock workspace
          <ShieldCheck size={17} />
        </Link>
      </section>
    </main>
  );
}

