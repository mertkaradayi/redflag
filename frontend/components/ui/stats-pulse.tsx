"use client";

import { Activity, Zap, ShieldCheck } from "lucide-react";

export const StatsPulse = () => {
    return (
        <div className="relative w-full max-w-5xl mx-auto mt-20">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 relative z-10">
                {/* Stat 1 */}
                <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-500">
                            <Activity className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold text-foreground dark:text-white tabular-nums tracking-tight">
                        2,400+
                    </h3>
                    <p className="mt-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        Contracts Analyzed
                    </p>
                </div>

                {/* Stat 2 */}
                <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-500">
                            <Zap className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold text-foreground dark:text-white tracking-tight">
                        &lt; 90s
                    </h3>
                    <p className="mt-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        Average Turnaround
                    </p>
                </div>

                {/* Stat 3 */}
                <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-green-600 dark:text-green-500">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold text-foreground dark:text-white tracking-tight">
                        87%
                    </h3>
                    <p className="mt-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        Critical Risk Recall
                    </p>
                </div>
            </div>
        </div>
    );
};
