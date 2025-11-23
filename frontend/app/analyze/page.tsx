"use client";

import LLMAnalysis from "@/app/components/LLMAnalysis";
import { ClaritySection } from "@/components/ui/clarity-section";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function AnalyzePage() {
  return (
    <div className="relative w-full bg-white dark:bg-black min-h-screen overflow-hidden flex flex-col">
      {/* Background Beams for premium feel */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col bg-white dark:bg-black">

        {/* Hero / Interaction Section */}
        <section className="w-full max-w-4xl mx-auto px-6 pt-24 pb-12 md:pt-32 md:pb-20 text-center bg-white dark:bg-black">
          <div className="space-y-8 mb-12">
            <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl text-foreground dark:text-white">
              Analyze <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">Any Contract.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Instant, AI-powered security audit for Sui smart contracts. <br className="hidden sm:block" />
              Paste a package ID below to start the interrogation.
            </p>
          </div>

          {/* Main Interaction Card */}
          <div className="relative group max-w-2xl mx-auto text-left">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/80 p-2 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-neutral-100 dark:border-white/5 bg-white/50 dark:bg-white/5 p-6 sm:p-8">
                <LLMAnalysis />
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-70">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Gemini 2.5 Flash
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span>Supabase Observability</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span>Move-Native Patterns</span>
          </div>
        </section>

        {/* Clarity Section - Context */}
        <section className="w-full bg-white dark:bg-black">
          <ClaritySection />
        </section>
      </div>
    </div>
  );
}
