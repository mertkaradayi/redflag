import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Gauge, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import BrandLogo from "../components/BrandLogo";
import LLMAnalysis from "../components/LLMAnalysis";

interface Highlight {
  title: string;
  description: string;
  icon: ReactNode;
}

interface ProcessStep {
  title: string;
  summary: string;
  detail: string;
}

interface PatternGroup {
  title: string;
  items: string[];
  tone: "critical" | "high" | "moderate" | "low";
}

const highlights: Highlight[] = [
  {
    title: "Multi-Agent Intelligence",
    description:
      "Four specialist agents plus a critic interrogate every Move module before signing off on a verdict.",
    icon: <BrainCircuit className="h-5 w-5 text-[#D12226]" />,
  },
  {
    title: "Exploit-Aware Scoring",
    description:
      "Signals are weighted with real exploit data so high-impact flaws surface first in your queue.",
    icon: <ShieldAlert className="h-5 w-5 text-[#D12226]" />,
  },
  {
    title: "Fast Feedback Loop",
    description:
      "Average turnaround is under 90 seconds with cached context and streaming Gemini 2.5 responses.",
    icon: <Gauge className="h-5 w-5 text-[#D12226]" />,
  },
];

const processSteps: ProcessStep[] = [
  {
    title: "Ingest & Scope",
    summary: "Feed RedFlag a Sui package ID and choose the network.",
    detail: "We enrich it with deployment metadata, authority graph, and dependency lineage for full context.",
  },
  {
    title: "Agent Debate",
    summary: "Specialists propose risks, a scorer ranks severity, a critic blocks bias.",
    detail: "Each agent challenges the others, forcing consensus on every risky call-out before it leaves the pipeline.",
  },
  {
    title: "Evidence Assembly",
    summary: "We extract Move snippets, invariants, and execution traces that prove the risk.",
    detail: "Findings map directly to the risky function signatures so reviewers can reproduce issues instantly.",
  },
  {
    title: "Delivery & Monitoring",
    summary: "Reports render instantly here, on the dashboard, and via webhooks.",
    detail: "You get structured JSON, score history, and upgrade alerts so fixes never fall through the cracks.",
  },
];

const patternGroups: PatternGroup[] = [
  {
    title: "Critical Signals",
    tone: "critical",
    items: [
      "Admin drains & unrestricted asset custody",
      "Upgrade paths without multi-sig checkpoints",
      "Liquidity seize or forced redemption flows",
    ],
  },
  {
    title: "High-Risk Moves",
    tone: "high",
    items: [
      "Unlimited mint or burn capabilities",
      "Fee or slippage manipulation vectors",
      "Centralized access control without rotation",
      "Denial switch for essential functions",
    ],
  },
  {
    title: "Moderate Exposures",
    tone: "moderate",
    items: [
      "Oracle replay or drift windows",
      "Timestamp-dependent logic branches",
      "Reentrancy rebounds through shared objects",
      "Flash-loan susceptible arithmetic",
    ],
  },
  {
    title: "Surface Noise",
    tone: "low",
    items: [
      "Unchecked integer operations",
      "Inefficient storage clean-up risks",
      "Missing telemetry on irreversible actions",
    ],
  },
];

const toneClasses: Record<PatternGroup["tone"], string> = {
  critical:
    "border-[#D12226]/60 bg-[#D12226]/10 text-white",
  high: "border-white/20 bg-white/5 text-zinc-100",
  moderate: "border-white/15 bg-black/40 text-zinc-200",
  low: "border-white/10 bg-black/30 text-zinc-300",
};

export default function AnalyzePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-12%] h-[520px] bg-[radial-gradient(circle_at_center,_rgba(209,34,38,0.28),_transparent_60%)]" />
        <div className="absolute left-1/2 top-[45%] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(209,34,38,0.18),_transparent_60%)] blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-10 sm:px-8 lg:gap-20 lg:px-16 lg:pt-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo className="h-9" priority />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 sm:inline">
              Analyze Contracts
            </span>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                View Dashboard
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Stress-test Sui contracts before they stress you.
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Paste a package ID, pick your network, and our multi-agent reviewer spins up a full security audit in
                minutes. Every risky function is ranked, justified, and ready for action.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-zinc-300 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#D12226]">
                    {highlight.icon}
                    {highlight.title}
                  </div>
                  <p className="leading-6 text-zinc-300">{highlight.description}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400 sm:text-xs">
              <span className="rounded-full border border-white/15 px-3 py-1">
                Gemini 2.5 Flash
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                Supabase Observability
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                Move-Native Patterns
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#D12226]/30 via-transparent to-[#D12226]/10 blur-2xl sm:-inset-4 lg:-inset-6" />
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="space-y-4 text-sm text-zinc-300">
                <h2 className="text-lg font-semibold text-white">What you’ll get</h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#D12226]" />
                    Prioritized risk report with impact, evidence, and mitigation notes.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#D12226]" />
                    Live connection to the dashboard so new analyses populate automatically.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#D12226]" />
                    Cached results for faster reruns and comparative drift detection.
                  </li>
                </ul>
              </div>
              <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-300">
                <p className="font-semibold text-white">Need to triage historical runs?</p>
                <p className="mt-2">
                  Head to the dashboard to replay past findings, export JSON payloads, and monitor score deltas across
                  deployments.
                </p>
                <Link href="/dashboard" className="mt-4 inline-flex items-center text-sm font-semibold text-[#D12226] hover:text-[#ff3d41]">
                  Jump to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-lg sm:p-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Run an analysis</h2>
              <p className="text-sm text-zinc-300">
                Enter a Move package ID to launch RedFlag’s end-to-end review pipeline.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="border-[#D12226] text-[#D12226] hover:bg-[#D12226]/20 hover:text-white">
                View completed reports
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
            <LLMAnalysis />
          </div>
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              How it works
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              From package submission to remediation guidance
            </h2>
            <p className="max-w-2xl text-base text-zinc-300">
              Every stage of the pipeline is tuned to catch real exploits, document context, and accelerate your
              engineering response.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {processSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-inner transition hover:border-[#D12226]/40"
              >
                <span className="absolute right-6 top-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#D12226]">
                  Step {index + 1}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm font-medium text-zinc-200">{step.summary}</p>
                <p className="text-sm text-zinc-300">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              Signals we classify
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Risk pattern library aligned to Move semantics
            </h2>
            <p className="max-w-2xl text-base text-zinc-300">
              RedFlag distills hundreds of attack patterns we&apos;ve collected from audits, red team engagements, and
              live incidents across the Sui ecosystem.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {patternGroups.map((group) => (
              <div
                key={group.title}
                className={`rounded-2xl border p-6 ${toneClasses[group.tone]}`}
              >
                <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-white/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#D12226]/60 via-[#D12226]/30 to-black p-6 text-center shadow-2xl sm:p-8 lg:p-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              Ready when you are
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Run your first RedFlag analysis and catch red flags before they catch you.
            </h2>
            <p className="text-base text-white/80">
              Keep this tab open while you triage findings, or jump to the dashboard to monitor trends as new packages
              are deployed.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/60 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  Review live dashboard
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                  Explore homepage
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
