"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Code2, Lock, Radar, ShieldCheck, Sparkles, Workflow, Zap, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CodeScanner } from "@/components/ui/code-scanner";

export default function Home() {
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
                header: (
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 h-full min-h-[6rem]">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Scanner Agent: Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Critic Agent: Active</span>
                    </div>
                    <div className="mt-auto flex items-center gap-2 rounded bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Critical Risk Detected</span>
                    </div>
                  </div>
                ),
                icon: <ShieldCheck className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Live Deployment Monitoring",
                description: "Track new Sui package drops in near real time.",
                header: (
                  <div className="relative flex h-full min-h-[6rem] w-full flex-col overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10">
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent z-10" />
                    <div className="flex flex-col gap-2 p-4 opacity-50">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
                      ))}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between rounded-lg bg-white dark:bg-neutral-800 p-2 shadow-sm border border-neutral-200 dark:border-white/5">
                      <span className="text-xs font-medium">New Package</span>
                      <span className="text-[10px] text-neutral-500">Just now</span>
                    </div>
                  </div>
                ),
                icon: <Radar className="h-4 w-4 text-neutral-500" />,
              },
              {
                title: "Explainable Findings",
                description: "Human-readable reasoning and mitigations.",
                header: (
                  <div className="flex h-full min-h-[6rem] w-full flex-col rounded-xl bg-neutral-900 p-4 border border-white/10 font-mono text-[10px] text-neutral-400">
                    <div className="flex gap-2">
                      <span className="text-purple-400">public fun</span>
                      <span className="text-blue-400">withdraw</span>
                      <span>(...) &#123;</span>
                    </div>
                    <div className="pl-4 flex gap-2 bg-red-500/20 -mx-4 px-4 py-0.5 my-1 border-l-2 border-red-500">
                      <span>assert!(amount &gt; 0, EZeroAmount);</span>
                    </div>
                    <div className="pl-4 text-neutral-500">// Missing capability check</div>
                    <div>&#125;</div>
                  </div>
                ),
                icon: <Code2 className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Workflow Friendly",
                description: "Seamless hand-offs into Jira, Linear, and custom pipelines.",
                header: (
                  <div className="flex h-full min-h-[6rem] w-full items-center justify-center gap-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 p-4">
                    <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-xs">Jira</div>
                    <ArrowRight className="h-4 w-4 text-neutral-400" />
                    <div className="h-8 w-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-600 font-bold text-xs">Lin</div>
                    <ArrowRight className="h-4 w-4 text-neutral-400" />
                    <div className="h-8 w-8 rounded bg-green-500/20 flex items-center justify-center text-green-600 font-bold text-xs">Slack</div>
                  </div>
                ),
                icon: <Workflow className="h-4 w-4 text-neutral-500" />,
              },
              {
                title: "Secure By Default",
                description: "Ephemeral infrastructure with encrypted storage.",
                header: (
                  <div className="flex h-full min-h-[6rem] w-full items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10">
                    <div className="relative">
                      <div className="absolute -inset-4 rounded-full bg-green-500/20 animate-pulse" />
                      <Lock className="relative h-8 w-8 text-green-600 dark:text-green-500" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-green-600 dark:text-green-500">
                        AES-256 Encrypted
                      </div>
                    </div>
                  </div>
                ),
                icon: <Lock className="h-4 w-4 text-red-500" />,
              },
              {
                title: "Adaptive Scoring",
                description: "Gemini-powered scoring tunes itself with every incident.",
                header: (
                  <div className="flex h-full min-h-[6rem] w-full items-end justify-between gap-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 p-4">
                    {[40, 60, 45, 70, 85].map((h, i) => (
                      <div
                        key={i}
                        className="w-full rounded-t bg-gradient-to-t from-red-500/50 to-red-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                ),
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: "Ingest", desc: "Pull bytecode & dependency graphs straight from Sui.", icon: Zap },
              { title: "Collaborate", desc: "Agents propose risks, scorer ranks them, critic challenges.", icon: Workflow },
              { title: "Deliver", desc: "Ship structured insights to your dashboards.", icon: BarChart3 },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-8 rounded-3xl border border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                <div className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#D12226] text-white font-bold text-xl shadow-lg shadow-red-900/20">
                  {i + 1}
                </div>
                <step.icon className="mt-6 h-10 w-10 text-neutral-500 dark:text-neutral-400 mb-4" />
                <h3 className="text-xl font-bold text-foreground dark:text-white mb-2">{step.title}</h3>
                <p className="text-neutral-600 dark:text-neutral-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 mb-20 relative rounded-3xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-gradient-to-b from-neutral-100 to-white dark:from-neutral-900 dark:to-black p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.15),transparent_70%)]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-4xl">Ready to accelerate?</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Unlock proactive smart contract security across your entire portfolio. Your first ten contracts are on us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/analyze">
                <Button className="bg-[#D12226] hover:bg-[#a8181b] text-white px-8 py-6 rounded-full text-lg w-full sm:w-auto">
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

