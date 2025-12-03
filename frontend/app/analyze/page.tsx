"use client";

import LLMAnalysis from "@/app/components/LLMAnalysis";
import { ClaritySection } from "@/components/ui/clarity-section";
import { motion } from "framer-motion";

export default function AnalyzePage() {
  return (
    <div className="relative w-full overflow-hidden bg-white dark:bg-black antialiased min-h-screen flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col bg-white dark:bg-black">

        {/* Hero / Interaction Section */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-12 md:pt-24 pb-12 md:pb-20 text-center bg-white dark:bg-black">
          <div className="flex flex-col items-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-sm dark:backdrop-blur-none"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400 tracking-wide uppercase">
                AI-Powered Risk Engine
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-4xl bg-opacity-50 bg-gradient-to-b from-neutral-600 to-neutral-900 dark:from-neutral-300 dark:to-neutral-200 bg-clip-text text-5xl font-bold text-transparent md:text-7xl leading-[1.1] tracking-tight mb-6"
            >
              Analyze <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">Any Contract.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl text-xl font-normal text-neutral-600 dark:text-neutral-300 leading-relaxed mb-10"
            >
              Instant, AI-powered security audit for Sui smart contracts. <br className="hidden sm:block" />
              Paste a package ID below to start the interrogation.
            </motion.p>
          </div>

          {/* Main Interaction Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative group max-w-3xl mx-auto text-left"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-blue-500/20 rounded-[2rem] blur-3xl opacity-30 dark:opacity-0 transition duration-1000" />
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-2 shadow-2xl dark:shadow-none backdrop-blur-xl dark:backdrop-blur-none">
              <div className="rounded-2xl border border-neutral-100 dark:border-white/5 bg-white dark:bg-black p-6 sm:p-8">
                <LLMAnalysis />
              </div>
            </div>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {[
              "Gemini 2.5 Flash",
              "Supabase Observability",
              "Move-Native Patterns"
            ].map((badge, i) => (
              <div key={i} className="px-4 py-1.5 rounded-full bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                {badge}
              </div>
            ))}
          </motion.div>
        </section>

        {/* Clarity Section - Context */}
        <section className="w-full bg-white dark:bg-black">
          <ClaritySection />
        </section>
      </div>
    </div>
  );
}
