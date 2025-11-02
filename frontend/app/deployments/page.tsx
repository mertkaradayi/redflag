import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, GaugeCircle, Globe2, Radar, RefreshCcw, ServerCog, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import BrandLogo from "../components/BrandLogo";
import Navigation from "../components/Navigation";
import DeploymentsTable from "../components/DeploymentsTable";

interface HighlightCard {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const highlightCards: HighlightCard[] = [
  {
    label: "Live Feed",
    title: "Always-on deployment watchers",
    description:
      "Background workers ingest new Move packages from Sui in near real time, tagging each deployer and checkpoint.",
    icon: <Radar className="h-6 w-6 text-[#D12226]" />,
  },
  {
    label: "Signal Over Noise",
    title: "Context-rich metadata",
    description:
      "Package, deployer, and transaction context ship together so you can jump straight into audits or runbook triage.",
    icon: <ServerCog className="h-6 w-6 text-[#D12226]" />,
  },
  {
    label: "Fast Hand-offs",
    title: "Deep-link to security analysis",
    description:
      "Kick off the AI analyzer on any deployment with one click and compare risk timelines across your portfolio.",
    icon: <Sparkles className="h-6 w-6 text-[#D12226]" />,
  },
  {
    label: "Time To Insight",
    title: "< 30s refresh cadence",
    description:
      "The feed auto-refreshes every 30 seconds so reviewers see the latest packages without smashing reload.",
    icon: <GaugeCircle className="h-6 w-6 text-[#D12226]" />,
  },
];

const deploymentLegend = [
  { swatch: "bg-[#D12226]", label: "Deployed in the last hour" },
  { swatch: "bg-white", label: "Within the last 24 hours" },
  { swatch: "bg-yellow-300", label: "Within the last 7 days" },
  { swatch: "bg-zinc-600", label: "Older deployments" },
];

export default function DeploymentsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-15%] h-[520px] bg-[radial-gradient(circle_at_center,_rgba(209,34,38,0.26),_transparent_60%)]" />
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(209,34,38,0.18),_transparent_60%)] blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-10 sm:px-8 lg:gap-20 lg:px-16 lg:pt-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo className="h-9" priority />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 sm:inline">
              Deployments Monitor
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end lg:gap-6">
            <Navigation />
          </div>
        </header>

        <section className="space-y-8">
          <div className="space-y-6">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Track every Move deployment the instant it hits Sui.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              RedFlag watches your environments around the clock, capturing package metadata, deployer addresses, and
              transaction digests so security and protocol teams can respond before issues roll into production.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500 sm:text-xs">
            <span className="rounded-full border border-white/15 px-3 py-1">Auto-refresh 30s</span>
            <span className="rounded-full border border-white/15 px-3 py-1">Explorer Deep Links</span>
            <span className="rounded-full border border-white/15 px-3 py-1">Analyze via Gemini 2.5</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/analyze" className="w-full sm:w-auto">
              <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                Launch analyzer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-inner backdrop-blur">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
            <RefreshCcw className="h-5 w-5 text-[#D12226]" />
            <span>Legend</span>
          </div>
          <p className="text-sm text-zinc-400">
            Card accents reflect deployment freshness so you can prioritize new launches first.
          </p>
          <ul className="space-y-3">
            {deploymentLegend.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className={`h-2.5 w-6 rounded-full ${item.swatch}`}></span>
                {item.label}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-zinc-400">
            <Globe2 className="h-4 w-4 text-white/70" />
            Monitoring Sui testnet — mainnet support coming soon.
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {highlightCards.map((card) => (
            <div
              key={card.title}
              className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300 shadow-lg transition hover:border-[#D12226]/40 hover:bg-[#D12226]/10 backdrop-blur"
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#D12226]">
                {card.icon}
                {card.label}
              </span>
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="leading-6 text-zinc-200">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur">
          <DeploymentsTable autoRefresh refreshInterval={30000} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#D12226]/60 via-[#D12226]/30 to-black p-6 text-center shadow-2xl sm:p-8 lg:p-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              Close the loop
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Turn new deployments into action with a single analysis.
            </h2>
            <p className="text-base text-white/80">
              Copy any package ID from the feed and fire up RedFlag’s multi-agent reviewer to surface security concerns
              before they reach production.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/60 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  View risk dashboard
                </Button>
              </Link>
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full bg-white text-[#D12226] hover:bg-zinc-100 sm:w-auto">
                  Start analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
