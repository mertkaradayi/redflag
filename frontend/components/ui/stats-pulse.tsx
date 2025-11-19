"use client";

import { Activity } from "lucide-react";

export const StatsPulse = () => {
    return (
        <div className="relative w-full max-w-6xl mx-auto mt-20 px-4">
            <div className="relative rounded-full border border-neutral-200/50 dark:border-white/5 bg-transparent shadow-none flex flex-col md:flex-row items-center justify-between py-4 px-8 gap-6 md:gap-0 overflow-hidden">

                {/* Gradient Background - Consistent with Bento */}
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-100/50 via-transparent to-transparent dark:from-white/5 pointer-events-none" />

                {/* System Status */}
                <div className="relative z-10 flex items-center gap-3 min-w-fit">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                        System Operational
                    </span>
                </div>

                {/* Divider (Desktop) */}
                <div className="hidden md:block h-8 w-px bg-neutral-200 dark:bg-white/10 relative z-10" />

                {/* Stat 1 */}
                <div className="relative z-10 flex flex-col items-center md:items-start">
                    <span className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider font-medium mb-1">
                        Contracts Scanned
                    </span>
                    <span className="text-xl font-mono font-bold text-foreground dark:text-white tabular-nums">
                        2,400+
                    </span>
                </div>

                {/* Divider (Desktop) */}
                <div className="hidden md:block h-8 w-px bg-neutral-200 dark:bg-white/10 relative z-10" />

                {/* Stat 2 */}
                <div className="relative z-10 flex flex-col items-center md:items-start">
                    <span className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider font-medium mb-1">
                        Avg. Turnaround
                    </span>
                    <span className="text-xl font-mono font-bold text-foreground dark:text-white tabular-nums">
                        &lt; 90ms
                    </span>
                </div>

                {/* Divider (Desktop) */}
                <div className="hidden md:block h-8 w-px bg-neutral-200 dark:bg-white/10 relative z-10" />

                {/* Stat 3 */}
                <div className="relative z-10 flex flex-col items-center md:items-start">
                    <span className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider font-medium mb-1">
                        Threats Blocked
                    </span>
                    <span className="text-xl font-mono font-bold text-foreground dark:text-white tabular-nums">
                        87%
                    </span>
                </div>
            </div>
        </div>
    );
};
