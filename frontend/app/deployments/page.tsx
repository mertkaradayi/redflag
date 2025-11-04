'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, GaugeCircle, Globe2, Radar, RefreshCcw, ServerCog, Sparkles, ExternalLink, PauseCircle, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import DeploymentsTable from "../components/DeploymentsTable";
import { cn } from "@/lib/utils";

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
  { swatch: "bg-zinc-400 dark:bg-white", label: "Within the last 24 hours" },
  { swatch: "bg-yellow-500 dark:bg-yellow-300", label: "Within the last 7 days" },
  { swatch: "bg-zinc-600 dark:bg-zinc-600", label: "Older deployments" },
];

export default function DeploymentsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 transition-colors duration-200 sm:px-8 lg:gap-5 lg:px-16">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-15%] h-[520px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.26),transparent_60%)] dark:opacity-100 opacity-0" />
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl dark:opacity-100 opacity-0" />
      </div>
        <section className="space-y-6 transition-colors duration-200">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground dark:text-white sm:text-5xl">
              Track every Move deployment the instant it hits Sui.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              RedFlag watches your environments around the clock, capturing package metadata, deployer addresses, and
              transaction digests so security and protocol teams can respond before issues roll into production.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/analyze" className="w-full sm:w-auto">
              <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                Start analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                  "text-[11px] font-semibold uppercase tracking-[0.3em] sm:text-xs",
                  autoRefresh
                    ? "border-[#D12226]/40 bg-[#D12226]/10 text-[#D12226] dark:border-[#D12226]/60 dark:bg-[#D12226]/20 dark:text-[#D12226]"
                    : "border-border dark:border-white/15 text-muted-foreground hover:border-[#D12226]/40 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10"
                )}
                aria-label={`Auto-refresh is ${autoRefresh ? 'on' : 'off'}`}
              >
                {autoRefresh ? (
                  <PauseCircle className="h-3.5 w-3.5" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" />
                )}
                <span className="text-foreground dark:text-white/90">Auto-refresh</span>
                <span className={cn(
                  "text-[10px] font-medium",
                  autoRefresh ? "text-[#D12226]" : "text-muted-foreground"
                )}>
                  {autoRefresh ? 'ON' : 'OFF'}
                </span>
                {autoRefresh && <span className="text-[10px] text-[#D12226] font-medium">30s</span>}
              </button>

              {/* Divider */}
              <div className="h-4 w-px bg-border dark:bg-white/15" />

              {/* Explorer Link */}
              <a
                href="https://suiexplorer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border dark:border-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-foreground transition-colors hover:border-[#D12226]/40 hover:bg-[#D12226]/5 dark:text-white/90 dark:hover:bg-[#D12226]/10 sm:text-xs"
                aria-label="Open Sui Explorer"
              >
                <Globe2 className="h-3.5 w-3.5 text-[#D12226]" />
                <span>Explorer</span>
                <ExternalLink className="h-3 w-3 text-[#D12226]" />
              </a>
            </div>
          </div>
        </section>

        <section className="-mx-4 py-6 px-4 sm:-mx-8 sm:px-8 lg:-mx-16 lg:px-16">
          <DeploymentsTable autoRefresh={autoRefresh} refreshInterval={30000} />
        </section>

        <section className="-mx-4 grid gap-6 transition-colors duration-200 sm:-mx-8 lg:-mx-16 lg:grid-cols-[1fr_2fr]">
          <section className="w-full space-y-4 rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 py-6 px-4 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200 sm:px-8 lg:px-16">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              <RefreshCcw className="h-5 w-5 text-[#D12226]" />
              <span>Legend</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Card accents reflect deployment freshness so you can prioritize new launches first.
            </p>
            <ul className="space-y-3">
              {deploymentLegend.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-foreground dark:text-white/80">
                  <span className={`h-2.5 w-6 rounded-full ${item.swatch}`}></span>
                  {item.label}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-4 py-3 text-xs text-muted-foreground">
              <Globe2 className="h-4 w-4 text-foreground/70 dark:text-white/70" />
              Monitoring Sui testnet — mainnet support coming soon.
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            {highlightCards.map((card) => (
              <div
                key={card.title}
                className="flex h-full flex-col gap-4 rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 p-6 text-sm text-muted-foreground shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200 hover:border-[#D12226]/40 hover:bg-[#D12226]/10 dark:hover:bg-[#D12226]/10"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#D12226]">
                  {card.icon}
                  {card.label}
                </span>
                <h2 className="text-lg font-semibold text-foreground dark:text-white">{card.title}</h2>
                <p className="leading-6 text-muted-foreground dark:text-white/80">{card.description}</p>
              </div>
            ))}
          </section>
        </section>

        <section className="-mx-4 rounded-xl border border-border dark:border-white/10 bg-linear-to-br from-[#D12226]/60 via-[#D12226]/30 to-background dark:from-[#D12226]/60 dark:via-[#D12226]/30 dark:to-black py-6 px-4 text-center shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200 sm:-mx-8 sm:py-8 sm:px-8 lg:-mx-16 lg:py-10 lg:px-16">
          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              Close the loop
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Turn new deployments into action with a single analysis.
            </h2>
            <p className="text-base text-white/80">
              Copy any package ID from the feed and fire up RedFlag's multi-agent reviewer to surface security concerns
              before they reach production.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/60 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  Dashboard
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
    </div>
  );
}
