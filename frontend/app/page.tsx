import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BarChart3, Lock, Radar, ShieldCheck, Sparkles, Workflow } from "lucide-react";

import Auth from "./components/Auth";
import BrandLogo from "./components/BrandLogo";
import { Button } from "@/components/ui/button";

interface StatCard {
  value: string;
  label: string;
  subtext: string;
}

interface FeatureHighlight {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
}

interface ProcessStep {
  title: string;
  summary: string;
  detail: string;
}

interface Differentiator {
  title: string;
  description: string;
}

const stats: StatCard[] = [
  {
    value: "2.4k+",
    label: "Contracts Analyzed",
    subtext: "Indexed across mainnet and testnet",
  },
  {
    value: "< 90s",
    label: "Average Turnaround",
    subtext: "LLM pipeline from request to report",
  },
  {
    value: "87%",
    label: "Critical Risk Recall",
    subtext: "Benchmarked vs manual audits",
  },
];

const features: FeatureHighlight[] = [
  {
    title: "Agent-Driven Risk Reports",
    description:
      "Our 4-agent + 1-critic workflow cross-checks every finding so you never ship with blind spots.",
    icon: ShieldCheck,
    category: "Multi-Agent LLM",
  },
  {
    title: "Live Deployment Monitoring",
    description:
      "Track new Sui package drops in near real time and surface regressions before they impact users.",
    icon: Radar,
    category: "Observability",
  },
  {
    title: "Explainable Findings",
    description:
      "Each risky function is annotated with human-readable reasoning, recommended mitigations, and impact assessments.",
    icon: BarChart3,
    category: "Developer Velocity",
  },
  {
    title: "Workflow Friendly",
    description:
      "Seamless hand-offs into Jira, Linear, and custom pipelines with structured JSON exports and webhooks.",
    icon: Workflow,
    category: "Integrations",
  },
  {
    title: "Secure By Default",
    description:
      "All analyses run against ephemeral infrastructure with encrypted Supabase storage and role-scoped access.",
    icon: Lock,
    category: "Platform Hardening",
  },
  {
    title: "Adaptive Scoring",
    description:
      "Gemini-powered scoring tunes itself with every resolved incident, learning from your team’s triage decisions.",
    icon: Sparkles,
    category: "Continuous Learning",
  },
];

const process: ProcessStep[] = [
  {
    title: "Ingest & Contextualize",
    summary: "Pull bytecode, interfaces, and dependency graphs straight from Sui.",
    detail:
      "Our crawler enriches package data with deployment history, upgrade authority, and known maintainer metadata.",
  },
  {
    title: "Agent Collaboration",
    summary: "Specialized agents propose risks, a scorer ranks them, and a critic challenges assumptions.",
    detail:
      "The feedback loop ensures we capture privilege escalations, frozen funds, and rug pulls with minimal noise.",
  },
  {
    title: "Deliver & Monitor",
    summary: "Ship structured insights to your dashboards and alerting channels.",
    detail:
      "Auto-refreshing dashboards, webhooks, and historical comparisons keep your reviewers in sync.",
  },
];

const differentiators: Differentiator[] = [
  {
    title: "Purpose-Built For Sui",
    description:
      "Pattern libraries are tuned to Move semantics—everything from transfer caps to upgrade policies is understood.",
  },
  {
    title: "Red Team Approved",
    description:
      "Findings are validated against real exploit kits collected from adversarial engagements and CTF archives.",
  },
  {
    title: "Bias-Resistant Reviews",
    description:
      "The critic agent is designed to block rubber-stamped approvals, forcing consensus on every reported issue.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-10%] h-[600px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.28),transparent_60%)]" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-12 sm:px-12 lg:px-16">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-9" priority />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 sm:inline">
              Sui Security Intelligence
            </span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-6 text-sm text-zinc-300 sm:flex">
              <Link href="/summary" className="transition hover:text-white">
                Summary
              </Link>
              <Link href="/analyze" className="transition hover:text-white">
                Analyze
              </Link>
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <Link href="/deployments" className="transition hover:text-white">
                Deployments
              </Link>
            </nav>
            <Auth />
          </div>
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D12226]/50 bg-[#D12226]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#D12226]">
              <Sparkles className="h-4 w-4 text-[#D12226]" />
              AI Multi-Agent Risk Scanner for Sui
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Ship Sui smart contracts with zero guesswork.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-zinc-300">
                RedFlag orchestrates a swarm of specialists that dissect every Move module, flag risky functions,
                and hand you a prioritized remediation plan—before your users ever see mainnet.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full bg-[#D12226] text-white transition hover:bg-[#a8181b] sm:w-auto">
                  Start a Contract Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-[#D12226]/50 bg-transparent text-zinc-200 hover:border-[#D12226] hover:text-[#D12226] sm:w-auto"
                >
                  See Live Risk Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-8 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#D12226]" />
                Production ready
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-white" />
                Backed by Supabase + Gemini 2.5
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#D12226]" />
                Built for security teams & DeFi founders
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-linear-to-br from-[#D12226]/40 via-transparent to-[#D12226]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-8 shadow-xl backdrop-blur">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">What our agents monitor</h2>
                <ul className="space-y-4 text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 text-[#D12226]" />
                    Privileged function pathways & capability revokes
                  </li>
                  <li className="flex items-start gap-3">
                    <Radar className="mt-1 h-5 w-5 text-white" />
                    Sudden owner upgrades with unreviewed code diffs
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="mt-1 h-5 w-5 text-[#D12226]" />
                    Cross-contract liquidity drains and rate limit bypasses
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-5 w-5 text-white" />
                    Emerging exploit signatures from battle-tested red teams
                  </li>
                </ul>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-sm text-zinc-200">
                <div>
                  <p className="text-2xl font-semibold text-[#D12226]">98%</p>
                  <p className="text-xs text-zinc-400">Noise Reduction vs raw scanners</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">4</p>
                  <p className="text-xs text-zinc-400">Specialist agents per review</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
            >
              <p className="text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-400">
                {stat.label}
              </p>
              <p className="mt-3 text-sm text-zinc-400">{stat.subtext}</p>
            </div>
          ))}
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              Why teams pick RedFlag
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Security that keeps up with shipping fast</h2>
            <p className="max-w-2xl text-base text-zinc-300">
              Replace fragmented scripts with a single control plane that understands Move, scales with your roadmap,
              and gives auditors and engineers a shared source of truth.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
              >
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                    {feature.category}
                  </span>
                  <feature.icon className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm leading-6 text-zinc-300">{feature.description}</p>
                </div>
                <div className="pt-5 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Built for production
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 rounded-3xl border border-white/10 bg-linear-to-br from-white/10 via-transparent to-[#D12226]/15 p-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              How it works
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">From package to roadmap in minutes</h2>
            <p className="text-base text-zinc-300">
              RedFlag packages deep technical signal into the exact context your engineers, protocol designers, and
              product managers need to prioritize fixes—without waiting on manual reports.
            </p>
            <Link href="/analyze">
              <Button
                variant="outline"
                className="border-[#D12226] bg-transparent text-[#D12226] hover:bg-[#D12226]/20 hover:text-white"
              >
                Launch the Analyzer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ol className="space-y-6">
            {process.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-white/10 bg-black/30 p-6 shadow-inner transition hover:border-[#D12226]/40"
              >
                <span className="absolute right-6 top-6 text-sm font-semibold text-[#D12226]">
                  Step {index + 1}
                </span>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm font-medium text-zinc-300">{step.summary}</p>
                  <p className="text-sm text-zinc-400">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-10">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Why RedFlag stays resilient</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 leading-6 text-zinc-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-linear-to-br from-[#D12226]/70 via-[#D12226]/40 to-black p-10 text-center shadow-2xl">
          <div className="mx-auto max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              Ready to accelerate
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Unlock proactive smart contract security across your entire portfolio.
            </h2>
            <p className="text-base text-white/80">
              Spin up an analysis, invite your auditors, and stay ahead of every upgrade. Your first ten contracts are
              on us.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                  Start analyzing
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/40 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  View dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
