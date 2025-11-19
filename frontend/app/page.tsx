"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Code2, Lock, Radar as RadarIcon, ShieldCheck, Sparkles, Workflow, Zap, AlertTriangle, Search, FileText } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CodeScanner } from "@/components/ui/code-scanner";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { WarRoom, Radar, Autopsy, InputScanner, ReportGen, Gauge } from "@/components/ui/bento-visuals";

import { StatsPulse } from "@/components/ui/stats-pulse";
import { CTAInstant } from "@/components/ui/cta-instant";
import { ComparisonSection } from "@/components/ui/comparison-section";


export default function Home() {


  return (
    <div className="relative w-full overflow-hidden bg-background dark:bg-black/[0.96] antialiased bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 hidden dark:block" fill="white" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-6 md:pt-10">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-8 items-center mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 tracking-wide uppercase">
                Live Mainnet Risk Monitor
              </span>
            </div>

            <h1 className="bg-opacity-50 bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-neutral-50 dark:to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl lg:text-6xl leading-tight tracking-tight">
              The Real-Time Risk Engine for Sui <span className="inline-block ml-2" style={{ textShadow: 'none', WebkitTextFillColor: 'initial', background: 'none' }}>💧</span>.
            </h1>

            <p className="mt-4 max-w-2xl text-xl font-normal text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Safeguarding the ecosystem. RedFlag's autonomous swarm analyzes every contract deployment in real-time, instantly identifying malicious patterns and critical risks before they impact users.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/analyze">
                <Button className="bg-[#D12226] hover:bg-[#a8181b] text-white h-12 px-6 text-base rounded-full transition-all hover:scale-105 w-full sm:w-auto shadow-xl shadow-red-500/20 hover:shadow-red-500/40">
                  Analyze Contract <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-foreground dark:hover:text-white h-12 px-6 text-base rounded-full bg-transparent w-full sm:w-auto">
                  View Live Feed
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
        <StatsPulse />

        {/* Features Section (Bento Grid) */}
        <div className="mt-24 mb-32">
          <div className="text-center mb-16 space-y-6">
            <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl tracking-tight">
              Security that keeps up
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Replace fragmented scripts with a single control plane that understands Move, scales with your roadmap, and gives auditors and engineers a shared source of truth.
            </p>
          </div>

          <BentoGrid className="max-w-6xl mx-auto">
            {[
              {
                title: "Agent-Driven Risk Reports",
                description: "3-agent + 1-critic workflow cross-checks every finding.",
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
                title: "On-Demand Analysis",
                description: "Manually analyze any smart contract address from Mainnet and Testnet.",
                header: <InputScanner />,
                icon: <Search className="h-4 w-4 text-neutral-500" />,
              },
              {
                title: "Instant Audit Reports",
                description: "Generate professional, auditor-grade PDF reports with a single click.",
                header: <ReportGen />,
                icon: <FileText className="h-4 w-4 text-red-500" />,
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
                className={i === 3 || i === 6 ? "" : ""}
              />
            ))}
          </BentoGrid>
        </div>

        {/* Comparison Section */}
        <ComparisonSection />


        {/* CTA */}
        <CTAInstant />

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

