"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TrustedBySection = () => {
    return (
        <div className="w-full max-w-6xl mx-auto mt-32 mb-32 px-6">
            <div className="relative overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-8 md:p-16 text-center">

                <div className="relative z-10 flex flex-col items-center space-y-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <ShieldCheck className="h-6 w-6 text-red-500" />
                            <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Ecosystem Security</span>
                        </div>
                        <h2 className="text-4xl font-bold text-neutral-900 dark:text-white md:text-5xl tracking-tight">
                            Securing the Future of Sui.
                        </h2>
                        <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed">
                            RedFlag is the standard for real-time risk monitoring, trusted by leading protocols and developers to keep the ecosystem safe.
                        </p>
                    </div>

                    {/* Logos Grid (Placeholders) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500 py-8">
                        {/* Replace with actual SVGs/Images later */}
                        <div className="text-xl font-bold text-neutral-400 dark:text-neutral-600">Sui Foundation</div>
                        <div className="text-xl font-bold text-neutral-400 dark:text-neutral-600">Cetus</div>
                        <div className="text-xl font-bold text-neutral-400 dark:text-neutral-600">Scallop</div>
                        <div className="text-xl font-bold text-neutral-400 dark:text-neutral-600">Navi</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                        <Link href="https://discord.gg/redflag" target="_blank">
                            <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white h-12 px-8 text-base rounded-full transition-all hover:scale-105 w-full sm:w-auto shadow-lg shadow-indigo-500/20">
                                Join the Community <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/docs">
                            <Button variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 h-12 px-8 text-base rounded-full bg-transparent w-full sm:w-auto">
                                Read the Docs
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
