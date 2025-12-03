"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";

export default function SoonPage() {
    return (
        <div className="min-h-screen w-full bg-white dark:bg-black relative flex flex-col items-center justify-center antialiased overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] pointer-events-none" />

            {/* Light Mode Ambient Glow */}
            <div className="absolute inset-0 flex items-center justify-center dark:hidden pointer-events-none">
                <div className="h-[40rem] w-[40rem] bg-gradient-to-tr from-red-500/10 to-transparent rounded-full blur-3xl opacity-50 animate-pulse" />
            </div>

            {/* Dark Mode Spotlight */}
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 hidden dark:block" fill="white" />

            <div className="max-w-2xl mx-auto p-4 relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-medium mb-8 shadow-sm">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Under Construction
                    </div>

                    <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400">
                            Coming
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-red-600 to-red-900 dark:from-red-500 dark:to-red-900">
                            Soon
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed mb-12">
                        We're crafting the next generation of risk intelligence. This feature is currently being built by our engineering team.
                    </p>

                    <Link href="/">
                        <Button
                            size="lg"
                            className="h-12 px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all hover:scale-105 shadow-xl hover:shadow-2xl"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Return Home
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
