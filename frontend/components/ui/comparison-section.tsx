"use client";

import { Check, X } from "lucide-react";

export const ComparisonSection = () => {
    return (
        <div className="w-full max-w-6xl mx-auto mt-32 mb-20 px-6">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl">
                    Stop waiting for audits
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                    Traditional security firms are slow, expensive, and manual. RedFlag is instant, continuous, and scalable.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Feature Labels */}
                <div className="hidden md:flex flex-col justify-center space-y-8 py-8">
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-500 dark:text-neutral-500">Turnaround Time</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-500 dark:text-neutral-500">Cost per Audit</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-500 dark:text-neutral-500">Availability</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-500 dark:text-neutral-500">Coverage</div>
                    <div className="h-12 flex items-center text-lg font-medium text-neutral-500 dark:text-neutral-500">Report Format</div>
                </div>

                {/* Traditional Audits */}
                <div className="rounded-3xl p-8 flex flex-col space-y-8 opacity-40 hover:opacity-100 transition-opacity duration-500">
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
                <div className="relative rounded-3xl border border-red-500/20 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent p-8 flex flex-col space-y-8 shadow-none backdrop-blur-sm">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-red-500/20 z-10">
                        The New Standard
                    </div>

                    <div className="relative z-10 text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
                        RedFlag <span className="text-red-500">AI</span>
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Turnaround</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            {'<'} 90 Seconds <Check className="ml-2 h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        {'<'} 90 Seconds <Check className="ml-2 h-5 w-5 text-green-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Cost</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Fraction of cost <Check className="ml-2 h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Fraction of cost <Check className="ml-2 h-5 w-5 text-green-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Availability</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            24/7 On-Demand <Check className="ml-2 h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        24/7 On-Demand <Check className="ml-2 h-5 w-5 text-green-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Coverage</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Continuous <Check className="ml-2 h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Continuous <Check className="ml-2 h-5 w-5 text-green-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:hidden space-y-2">
                        <span className="text-sm text-red-500 uppercase tracking-wider">Report</span>
                        <div className="h-12 flex items-center text-lg font-bold text-foreground dark:text-white">
                            Live & Interactive <Check className="ml-2 h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <div className="relative z-10 hidden md:flex h-12 items-center text-lg font-bold text-foreground dark:text-white">
                        Live & Interactive <Check className="ml-2 h-5 w-5 text-green-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};
