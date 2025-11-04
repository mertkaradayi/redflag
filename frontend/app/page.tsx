import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BarChart3, Lock, Radar, ShieldCheck, Sparkles, Workflow } from "lucide-react";

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
    <div className="relative -mt-28 overflow-x-hidden pt-28 transition-colors duration-200 sm:-mt-32 sm:pt-32 lg:-mt-36 lg:pt-36">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-20%] h-[700px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.28),transparent_60%)] dark:opacity-100 opacity-0" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl dark:opacity-100 opacity-0" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 transition-colors duration-200 sm:px-8 lg:gap-20 lg:px-16">
        <section className="grid items-start gap-12 transition-colors duration-200 lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8 sm:space-y-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D12226]/50 bg-[#D12226]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#D12226]">
              <Sparkles className="h-4 w-4 text-[#D12226]" />
              AI Multi-Agent Risk Scanner for Sui
            </span>
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Ship Sui smart contracts with zero guesswork.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                RedFlag orchestrates a swarm of specialists that dissect every Move module, flag risky functions,
                and hand you a prioritized remediation plan—before your users ever see mainnet.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full bg-[#D12226] text-white transition hover:bg-[#a8181b] sm:w-auto">
                  Start analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-[#D12226]/50 bg-transparent text-muted-foreground hover:border-[#D12226] hover:text-[#D12226] sm:w-auto"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:text-sm sm:gap-8">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#D12226]" />
                Production ready
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-foreground dark:bg-white" />
                Backed by Supabase + Gemini 2.5
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#D12226]" />
                Built for security teams & DeFi founders
              </div>
            </div>
          </div>
          <div className="relative mt-8 sm:mt-12">
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#D12226]/40 via-transparent to-[#D12226]/10 blur-3xl sm:-inset-4 lg:-inset-6" />
            <div className="relative overflow-hidden rounded-3xl border border-border/50 dark:border-white/15 bg-card/50 dark:bg-white/5 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="space-y-5 sm:space-y-6">
                <h2 className="text-lg font-semibold text-foreground">What our agents monitor</h2>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 text-[#D12226]" />
                    Privileged function pathways & capability revokes
                  </li>
                  <li className="flex items-start gap-3">
                    <Radar className="mt-1 h-5 w-5 text-foreground dark:text-white" />
                    Sudden owner upgrades with unreviewed code diffs
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="mt-1 h-5 w-5 text-[#D12226]" />
                    Cross-contract liquidity drains and rate limit bypasses
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-5 w-5 text-foreground dark:text-white" />
                    Emerging exploit signatures from battle-tested red teams
                  </li>
                </ul>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-border dark:border-white/10 bg-background/40 dark:bg-black/40 p-4 text-center text-sm text-muted-foreground sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-[#D12226]">98%</p>
                  <p className="text-xs text-muted-foreground">Noise Reduction vs raw scanners</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-foreground dark:text-white">4</p>
                  <p className="text-xs text-muted-foreground">Specialist agents per review</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 transition-colors duration-200 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border dark:border-white/10 bg-card/50 dark:bg-white/5 p-6 shadow-lg transition-colors duration-200 hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
            >
              <p className="text-3xl font-semibold text-foreground dark:text-white">{stat.value}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{stat.subtext}</p>
            </div>
          ))}
        </section>

        <section className="space-y-10 transition-colors duration-200">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              Why teams pick RedFlag
            </p>
            <h2 className="text-3xl font-semibold text-foreground dark:text-white sm:text-4xl">Security that keeps up with shipping fast</h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Replace fragmented scripts with a single control plane that understands Move, scales with your roadmap,
              and gives auditors and engineers a shared source of truth.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border dark:border-white/10 bg-card/50 dark:bg-white/5 p-6 transition-colors duration-200 hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
              >
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full border border-border/50 dark:border-white/20 bg-card/50 dark:bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                    {feature.category}
                  </span>
                  <feature.icon className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">{feature.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </div>
                <div className="pt-5 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Built for production
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 rounded-3xl border border-border dark:border-white/10 bg-gradient-to-br from-card/50 via-transparent to-[#D12226]/15 dark:from-white/10 p-6 transition-colors duration-200 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:p-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              How it works
            </p>
            <h2 className="text-3xl font-semibold text-foreground dark:text-white sm:text-4xl">From package to roadmap in minutes</h2>
            <p className="text-base text-muted-foreground">
              RedFlag packages deep technical signal into the exact context your engineers, protocol designers, and
              product managers need to prioritize fixes—without waiting on manual reports.
            </p>
            <Link href="/analyze">
              <Button
                variant="outline"
                className="border-[#D12226] bg-transparent text-[#D12226] hover:bg-[#D12226]/20 hover:text-white"
              >
                Start analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ol className="space-y-6">
            {process.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-border dark:border-white/10 bg-background/30 dark:bg-black/30 p-6 shadow-inner transition-colors duration-200 hover:border-[#D12226]/40"
              >
                <span className="absolute right-6 top-6 text-sm font-semibold text-[#D12226]">
                  Step {index + 1}
                </span>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">{step.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{step.summary}</p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-10 transition-colors duration-200">
          <h2 className="text-3xl font-semibold text-foreground dark:text-white sm:text-4xl">Why RedFlag stays resilient</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border dark:border-white/10 bg-card/50 dark:bg-white/5 p-6 text-sm text-muted-foreground transition-colors duration-200 hover:border-[#D12226]/40 hover:bg-[#D12226]/10"
              >
                <h3 className="text-lg font-semibold text-foreground dark:text-white">{item.title}</h3>
                <p className="mt-3 leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border dark:border-white/10 bg-gradient-to-br from-[#D12226]/70 via-[#D12226]/40 to-background dark:to-black p-6 text-center shadow-2xl transition-colors duration-200 sm:p-8 lg:p-10">
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
                  Start analysis
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/40 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-border dark:border-white/10 pt-8 text-sm text-muted-foreground transition-colors duration-200 sm:flex-row">
          <span>© 2025 RedFlag Labs. All rights reserved.</span>
          <Link
            href="https://github.com/mertkaradayi/redflag"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="transition hover:text-foreground dark:hover:text-white"
          >
            Follow the build on GitHub
          </Link>
        </footer>
      </div>
    </div>
  );
}
