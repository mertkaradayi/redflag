"use client";

import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const ComparisonSection = () => {
    return (
        <div className="w-full max-w-5xl mx-auto mt-32 mb-20 px-4">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl">
                    Stop waiting for audits
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                    Traditional security firms are slow, expensive, and manual. RedFlag is instant, continuous, and scalable.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature Labels (Hidden on mobile, visible on desktop) */}
                <div className="hidden md:flex flex-col justify-center space-y-8 py-8">
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-600 dark:text-neutral-400">Turnaround Time</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-600 dark:text-neutral-400">Cost per Audit</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-600 dark:text-neutral-400">Availability</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-600 dark:text-neutral-400">Coverage</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-600 dark:text-neutral-400">Report Format</div>
                </div>

                {/* Traditional Audits */}
                <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-8 flex flex-col space-y-8 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="text-xl font-bold text-neutral-500 dark:text-neutral-400 mb-4">Traditional Firms</div>

                    <div className="flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-neutral-500 uppercase tracking-wider">Turnaround</span>
                        <div className="h-12 flex items-center text-lg text-neutral-600 dark:text-neutral-400">
                            <X className="mr-2 h-5 w-5 text-neutral-400" /> Weeks / Months
                        </div>
                    </div>
                    <div className="hidden md:flex h-12 items-center text-lg text-neutral-600 dark:text-neutral-400">
                        <X className="mr-2 h-5 w-5 text-neutral-400" /> Weeks / Months
                    </div>

                    <div className="flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-neutral-500 uppercase tracking-wider">Cost</span>
                        <div className="h-12 flex items-center text-lg text-neutral-600 dark:text-neutral-400">
                            <X className="mr-2 h-5 w-5 text-neutral-400" /> $5k - $50k+
                        </div>
                    </div>
                    <div className="hidden md:flex h-12 items-center text-lg text-neutral-600 dark:text-neutral-400">
                        <X className="mr-2 h-5 w-5 text-neutral-400" /> $5k - $50k+
                    </div>

                    <div className="flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-neutral-500 uppercase tracking-wider">Availability</span>
                        <div className="h-12 flex items-center text-lg text-neutral-600 dark:text-neutral-400">
                            <X className="mr-2 h-5 w-5 text-neutral-400" /> Booked out
                        </div>
                    </div>
                    <div className="hidden md:flex h-12 items-center text-lg text-neutral-600 dark:text-neutral-400">
                        <X className="mr-2 h-5 w-5 text-neutral-400" /> Booked out
                    </div>

                    <div className="flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-neutral-500 uppercase tracking-wider">Coverage</span>
                        <div className="h-12 flex items-center text-lg text-neutral-600 dark:text-neutral-400">
                            <X className="mr-2 h-5 w-5 text-neutral-400" /> Snapshot in time
                        </div>
                    </div>
                    <div className="hidden md:flex h-12 items-center text-lg text-neutral-600 dark:text-neutral-400">
                        <X className="mr-2 h-5 w-5 text-neutral-400" /> Snapshot in time
                    </div>

                    <div className="flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-neutral-500 uppercase tracking-wider">Report</span>
                        <div className="h-12 flex items-center text-lg text-neutral-600 dark:text-neutral-400">
                            <X className="mr-2 h-5 w-5 text-neutral-400" /> Static PDF
                        </div>
                    </div>
                    <div className="hidden md:flex h-12 items-center text-lg text-neutral-600 dark:text-neutral-400">
                        <X className="mr-2 h-5 w-5 text-neutral-400" /> Static PDF
                    </div>
                </div>

                {/* RedFlag */}
                <div className="relative rounded-3xl border border-red-500/50 bg-white dark:bg-neutral-900 p-8 flex flex-col space-y-8 shadow-2xl shadow-red-500/20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-red-500/40 z-10">
                        The New Standard
                    </div>

                    <div className="relative z-10 text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
                        RedFlag <span className="text-red-500">AI</span>
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Turnaround</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            &lt; 90 Seconds <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        &lt; 90 Seconds <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Cost</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Fraction of cost <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Fraction of cost <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Availability</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            24/7 On-Demand <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        24/7 On-Demand <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Coverage</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Continuous <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Continuous <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Report</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Live & Interactive <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Live & Interactive <Check className="ml-2 h-5 w-5 text-green-500 fill-green-500/20" />
                    </div>
                </div>
            </div>
        </div>
    );
};
