"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const CTACommand = () => {
    return (
        <div className="relative mt-32 mb-20 w-full max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-12 text-center shadow-xl border border-neutral-800">

                <div className="relative z-10 flex flex-col items-center space-y-8">
                    <div className="space-y-4 max-w-2xl">
                        <h2 className="text-3xl font-bold text-white md:text-4xl tracking-tight">
                            Ready to secure your roadmap?
                        </h2>
                        <p className="text-neutral-400 text-lg">
                            Unlock proactive smart contract security across your entire portfolio.
                            <br />
                            <span className="text-white font-medium">Your first ten contracts are on us.</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link href="/analyze">
                            <Button className="h-12 px-8 text-base bg-white text-black hover:bg-neutral-200 rounded-full transition-colors font-semibold">
                                Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button variant="outline" className="h-12 px-8 text-base border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-full bg-transparent">
                                View Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
