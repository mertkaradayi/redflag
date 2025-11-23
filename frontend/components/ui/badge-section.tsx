"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BadgeSection = () => {
    return (
        <div className="w-full max-w-6xl mx-auto mt-32 mb-32 px-6">
            <div className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white border border-neutral-800 p-8 md:p-20 text-center shadow-2xl shadow-black/50">

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center space-y-10">

                    {/* The Badge Visual */}
                    <div className="relative group cursor-default">
                        <div className="absolute -inset-1 bg-gradient-to-b from-red-500 to-red-900 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500" />
                        <div className="relative h-32 w-32 md:h-40 md:w-40 bg-gradient-to-b from-neutral-800 to-black rounded-full border border-neutral-700 flex items-center justify-center shadow-xl">
                            <ShieldCheck className="h-16 w-16 md:h-20 md:w-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />

                            {/* Verified Checkmark Overlay */}
                            <div className="absolute bottom-2 right-2 bg-white text-red-600 rounded-full p-1.5 border-4 border-black shadow-lg">
                                <Check className="h-4 w-4 md:h-5 md:w-5 stroke-[4]" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-2xl">
                        <h2 className="text-4xl font-bold text-white md:text-6xl tracking-tight">
                            The Mark of Safety.
                        </h2>
                        <p className="text-neutral-400 text-lg md:text-xl leading-relaxed">
                            When users see this, they know it's safe. Give your community the confidence they deserve with a continuous, real-time audit badge.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                        <Link href="/docs">
                            <Button className="bg-white text-black hover:bg-neutral-200 h-12 px-8 text-base rounded-full transition-all hover:scale-105 w-full sm:w-auto font-semibold">
                                Get Verified <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
