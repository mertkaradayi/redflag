import Link from "next/link";
import { ArrowRight, BarChart3, Radar, ShieldCheck, Sparkles, Zap, Database, Globe } from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import { Button } from "@/components/ui/button";

export default function Summary() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-10%] h-[600px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.28),transparent_60%)]" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pb-24 pt-10 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo className="h-9" priority />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 sm:inline">
              Sui Security Intelligence
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end lg:gap-6">
            <nav className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-300 sm:w-auto sm:justify-end">
              <Link
                href="/summary"
                className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
              >
                Summary
              </Link>
              <Link
                href="/analyze"
                className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
              >
                Analyze
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/deployments"
                className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
              >
                Deployments
              </Link>
            </nav>
          </div>
        </header>

        <section className="space-y-12 text-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D12226]/50 bg-[#D12226]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#D12226]">
              <Sparkles className="h-4 w-4 text-[#D12226]" />
              AI Multi-Agent Risk Scanner for Sui
            </span>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Ship Sui smart contracts with zero guesswork.
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              RedFlag orchestrates a swarm of AI specialists that dissect every Move module, flag risky functions, 
              and hand you a prioritized remediation plan—before your users ever see mainnet.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
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
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
            <p className="text-3xl font-semibold text-white">2.4k+</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Contracts Analyzed
            </p>
            <p className="mt-3 text-sm text-zinc-400">Indexed across mainnet and testnet</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
            <p className="text-3xl font-semibold text-white">&lt; 90s</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Average Turnaround
            </p>
            <p className="mt-3 text-sm text-zinc-400">LLM pipeline from request to report</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
            <p className="text-3xl font-semibold text-white">87%</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Critical Risk Recall
            </p>
            <p className="mt-3 text-sm text-zinc-400">Benchmarked vs manual audits</p>
          </div>
        </section>

        <section className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              How it works
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">From package to roadmap in minutes</h2>
            <p className="mx-auto max-w-2xl text-base text-zinc-300">
              RedFlag packages deep technical signal into the exact context your engineers, protocol designers, 
              and product managers need to prioritize fixes—without waiting on manual reports.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Multi-Agent LLM
                </span>
                <ShieldCheck className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Agent-Driven Risk Reports</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Our 4-agent + 1-critic workflow cross-checks every finding so you never ship with blind spots.
                </p>
              </div>
            </div>

            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Observability
                </span>
                <Radar className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Live Deployment Monitoring</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Track new Sui package drops in near real time and surface regressions before they impact users.
                </p>
              </div>
            </div>

            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Developer Velocity
                </span>
                <BarChart3 className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Explainable Findings</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Each risky function is annotated with human-readable reasoning, recommended mitigations, and impact assessments.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              Coming Soon
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Next-Gen Security Features</h2>
            <p className="mx-auto max-w-2xl text-base text-zinc-300">
              We&apos;re building the future of smart contract security with advanced features designed for the Sui ecosystem.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Decentralized Storage
                </span>
                <Database className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Walrus Integration</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Immutable audit trail storage on Sui&rsquo;s decentralized storage with on-chain verification and tamper-proof records.
                </p>
              </div>
            </div>

            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Personalization
                </span>
                <Zap className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Smart Watchlists</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Monitor specific wallet addresses and contracts with real-time alerts and personalized risk assessments.
                </p>
              </div>
            </div>

            <div className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D12226]">
                  Ecosystem Integration
                </span>
                <Globe className="h-8 w-8 text-[#D12226] transition-transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-semibold text-white">Sui Ecosystem Deep Dive</h3>
                <p className="text-sm leading-6 text-zinc-300">
                  Advanced integration with SuiNS, DeepBook, Cetus, and other core Sui protocols for comprehensive risk analysis.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D12226]">
              Why RedFlag stays resilient
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Purpose-Built For Sui</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <h3 className="text-lg font-semibold text-white">Move-Specific Patterns</h3>
              <p className="mt-3 leading-6 text-zinc-300">
                Pattern libraries are tuned to Move semantics—everything from transfer caps to upgrade policies is understood.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <h3 className="text-lg font-semibold text-white">Red Team Approved</h3>
              <p className="mt-3 leading-6 text-zinc-300">
                Findings are validated against real exploit kits collected from adversarial engagements and CTF archives.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300 transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10">
              <h3 className="text-lg font-semibold text-white">Bias-Resistant Reviews</h3>
              <p className="mt-3 leading-6 text-zinc-300">
                The critic agent is designed to block rubber-stamped approvals, forcing consensus on every reported issue.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-linear-to-br from-[#D12226]/70 via-[#D12226]/40 to-black p-6 text-center shadow-2xl sm:p-8 lg:p-10">
          <div className="mx-auto max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              Ready to accelerate
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Unlock proactive smart contract security across your entire portfolio.
            </h2>
            <p className="text-base text-white/80">
              Spin up an analysis, invite your auditors, and stay ahead of every upgrade. Your first ten contracts are on us.
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
