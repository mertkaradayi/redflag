"use client";

import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const CTAInstant = () => {
    return (
        <div className="relative w-full max-w-4xl mx-auto mt-32 mb-32 px-4">
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 p-8 md:p-16 text-center shadow-xl dark:shadow-2xl shadow-neutral-200/50 dark:shadow-black/50">
                {/* Background Effects - Subtle */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.02),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_50%)]" />

                <div className="relative z-10 flex flex-col items-center space-y-8">
                    <div className="space-y-4 max-w-2xl">
                        <h2 className="text-4xl font-bold text-neutral-900 dark:text-white md:text-5xl tracking-tight">
                            Audit your code in seconds.
                        </h2>
                        <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                            Paste your contract address below for a preliminary risk report.
                            <br />
                            <span className="text-neutral-500 text-sm">No credit card required. Instant results.</span>
                        </p>
                    </div>

                    <div className="w-full max-w-md relative">
                        <div className="relative flex items-center bg-white dark:bg-neutral-900 rounded-xl p-1.5 border border-neutral-200 dark:border-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-neutral-200 dark:focus-within:ring-neutral-700 transition-all">
                            <Search className="ml-3 h-5 w-5 text-neutral-400" />
                            <Input
                                type="text"
                                placeholder="0x..."
                                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 h-12"
                            />
                            <Button className="h-10 px-6 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-medium rounded-lg transition-colors shadow-sm">
                                Scan Now
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-neutral-500 font-medium">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span>Mainnet Ready</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span>Sui Move</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
