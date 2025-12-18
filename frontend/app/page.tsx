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



export default function Home() {


  return (
    <div className="relative w-full overflow-hidden bg-background dark:bg-black/[0.96] antialiased bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 hidden dark:block" fill="white" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-12 md:pt-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center pb-24 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400 tracking-wide uppercase">
              Live Mainnet Risk Monitor
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl bg-opacity-50 bg-gradient-to-b from-neutral-600 to-neutral-900 dark:from-neutral-300 dark:to-neutral-200 bg-clip-text text-5xl font-bold text-transparent md:text-7xl leading-[1.1] tracking-tight mb-6"
          >
            Continuous Audit & Risk Monitoring for Sui<span className="inline-block ml-2" style={{ backgroundClip: 'border-box', WebkitTextFillColor: 'initial', color: 'initial' }}>💧</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl text-xl font-normal text-neutral-600 dark:text-neutral-300 leading-relaxed mb-10"
          >
            Automated, auditor-grade analysis for every smart contract. RedFlag analyzes every bytecode deployment in real-time, providing instant risk scores and actionable security insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16"
          >
            <Link href="/analyze">
              <Button className="bg-[#D12226] hover:bg-[#a8181b] text-white h-12 px-8 text-base rounded-full transition-all hover:scale-105 w-full sm:w-auto shadow-xl shadow-red-500/20 hover:shadow-red-500/40">
                Analyze Contract <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-foreground dark:hover:text-white h-12 px-8 text-base rounded-full bg-transparent w-full sm:w-auto">
                View Live Feed
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative w-full max-w-5xl mx-auto"
          >
            {/* Glow Effect behind scanner */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-blue-500/20 rounded-[2rem] blur-3xl opacity-30 dark:opacity-20" />

            <CodeScanner />
          </motion.div>
        </div>

        {/* Stats Section */}
        <StatsPulse />

        {/* Features Section (Bento Grid) */}
        <div className="py-24 md:py-32">
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
      </div>
    </div>
  );
}

