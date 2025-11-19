"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Code2, Lock, Radar as RadarIcon, ShieldCheck, Sparkles, Workflow, Zap, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CodeScanner } from "@/components/ui/code-scanner";
import { Timeline } from "@/components/ui/timeline";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { WarRoom, Radar, Autopsy, Pipeline, ShieldVisual, Gauge } from "@/components/ui/bento-visuals";

export default function Home() {
  const timelineData = [
    {
      title: "Ingest",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Pull bytecode, interfaces, and dependency graphs straight from Sui. Our crawler enriches package data with deployment history, upgrade authority, and known maintainer metadata.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 flex items-center gap-3">
              <Zap className="text-yellow-500 h-6 w-6" />
              <span className="text-sm font-medium">Real-time Indexing</span>
            </div>
            <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 flex items-center gap-3">
              <Code2 className="text-blue-500 h-6 w-6" />
              <span className="text-sm font-medium">Bytecode Analysis</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Collaborate",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Specialized agents propose risks, a scorer ranks them, and a critic challenges assumptions. The feedback loop ensures we capture privilege escalations, frozen funds, and rug pulls with minimal noise.
          </p>
          <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-green-500 h-5 w-5" />
              <span className="font-semibold text-sm">Multi-Agent Consensus</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Deliver",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
            Ship structured insights to your dashboards and alerting channels. Auto-refreshing dashboards, webhooks, and historical comparisons keep your reviewers in sync.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Workflow className="h-4 w-4" /> Webhooks
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-background dark:bg-black/[0.96] antialiased bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 hidden dark:block" fill="white" />

      <div className="relative z-10 mx-auto w-full max-w-7xl p-4 pt-20 md:pt-32">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 px-3 py-1 text-sm text-neutral-600 dark:text-neutral-300 backdrop-blur-xl mb-8">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              AI Multi-Agent Risk Scanner for Sui
            </div>

            <h1 className="bg-opacity-50 bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-neutral-50 dark:to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl lg:text-7xl leading-tight">
              Ship Sui smart contracts with zero guesswork.
            </h1>

            <p className="mt-6 max-w-lg text-base font-normal text-neutral-600 dark:text-neutral-300 md:text-lg">
              RedFlag orchestrates a swarm of specialists that dissect every Move module, flag risky functions, and hand you a prioritized remediation plan.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/analyze">
                <Button className="bg-[#D12226] hover:bg-[#a8181b] text-white px-8 py-6 text-lg rounded-full transition-all hover:scale-105 w-full sm:w-auto">
                  Start Analysis <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-foreground dark:hover:text-white px-8 py-6 text-lg rounded-full bg-transparent w-full sm:w-auto">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-full"
          >
            <CodeScanner />
          </motion.div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto"
        >
          {[
            { value: "2.4k+", label: "Contracts Analyzed", sub: "Mainnet & Testnet" },
            { value: "< 90s", label: "Average Turnaround", sub: "LLM Pipeline" },
            { value: "87%", label: "Critical Risk Recall", sub: "Vs Manual Audits" },
          ].map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-white/5 p-6 text-center backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-50/50 dark:hover:bg-white/10">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <h3 className="text-3xl font-bold text-foreground dark:text-white">{stat.value}</h3>
              <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{stat.label}</p>
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{stat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Features Section (Bento Grid) */}
        <div className="mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl">Security that keeps up</h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Replace fragmented scripts with a single control plane that understands Move, scales with your roadmap, and gives auditors and engineers a shared source of truth.
            </p>
          </div>

          <BentoGrid className="max-w-6xl mx-auto">
            {[
              {
                title: "Agent-Driven Risk Reports",
                description: "4-agent + 1-critic workflow cross-checks every finding.",
                header: <WarRoom />,
                icon: <ShieldCheck className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Live Deployment Monitoring",
                description: "Track new Sui package drops in near real time.",
                header: <Radar />,
                icon: <RadarIcon className="h-4 w-4 text-neutral-500" />,
              },
              {
                title: "Explainable Findings",
                description: "Human-readable reasoning and mitigations.",
                header: <Autopsy />,
                icon: <Code2 className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Workflow Friendly",
                description: "Seamless hand-offs into Jira, Linear, and custom pipelines.",
                header: <Pipeline />,
                icon: <Workflow className="h-4 w-4 text-neutral-500" />,
              },
              {
                title: "Secure By Default",
                description: "Ephemeral infrastructure with encrypted storage.",
                header: <ShieldVisual />,
                icon: <Lock className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Adaptive Scoring",
                description: "Gemini-powered scoring tunes itself with every incident.",
                header: <Gauge />,
                icon: <Sparkles className="h-4 w-4 text-neutral-500" />,
              },
            ].map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                icon={item.icon}
                className={i === 3 || i === 6 ? "md:col-span-2" : ""}
              />
            ))}
          </BentoGrid>
        </div>

        {/* How it works */}
        <div className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-foreground dark:text-white text-center md:text-5xl mb-16">From package to roadmap</h2>
          <Timeline data={timelineData} />
        </div>

        {/* CTA */}
        <div className="mt-20 mb-20 relative rounded-3xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-900 p-12 text-center">
          <BackgroundBeams className="opacity-40" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-4xl">Ready to accelerate?</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Unlock proactive smart contract security across your entire portfolio. Your first ten contracts are on us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/analyze">
                <Button className="bg-[#D12226] hover:bg-[#a8181b] text-white px-8 py-6 rounded-full text-lg w-full sm:w-auto shadow-[0_0_20px_rgba(209,34,38,0.5)] hover:shadow-[0_0_30px_rgba(209,34,38,0.7)] transition-shadow">
                  Start Analysis
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-white/10 py-8 text-center text-sm text-neutral-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2025 RedFlag Labs. All rights reserved.</p>
            <Link href="https://github.com/mertkaradayi/redflag" className="hover:text-foreground dark:hover:text-white transition-colors">
              Follow on GitHub
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

