"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export const SingularitySection = () => {
    return (
        <div className="w-full relative bg-white dark:bg-black py-24 md:py-32 overflow-visible h-[50rem] flex items-center justify-center transition-colors duration-500">

            {/* Background Environment */}
            <div className="absolute inset-0 bg-white dark:bg-black z-0 transition-colors duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_60%)]" />
                {/* Grid Pattern - Light Mode Only */}
                <div className="absolute inset-0 opacity-10 dark:opacity-0 transition-opacity duration-500 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />

                {/* Drifting Dust/Particles */}
                <div className="absolute inset-0 opacity-20 animate-pulse-slow"
                    style={{ backgroundImage: 'radial-gradient(#dc2626 1px, transparent 1px)', backgroundSize: '90px 90px' }} />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid place-items-center">

                {/* THE BLACK HOLE */}
                <div className="col-start-1 row-start-1 relative w-[500px] h-[500px] md:w-[700px] md:h-[700px] flex items-center justify-center perspective-distant opacity-90">

                    {/* 1. Gravitational Lensing (The halo of light bent over the top/bottom) 
                        This sits 'behind' visually but is upright to simulate the bent light from the back of the disk. 
                    */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full z-10 opacity-60 mix-blend-multiply dark:mix-blend-screen animate-spin-slow-reverse transition-all duration-500">
                        <div className="w-full h-full rounded-full border-20 md:border-30 border-t-red-500 border-b-red-600/50 border-l-transparent border-r-transparent blur-xl" />
                    </div>

                    {/* 2. The Accretion Disk (The Tilted Ring) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] z-20 preserve-3d accretion-disk">
                        {/* The swirling matter */}
                        <div className="absolute inset-0 rounded-full animate-spin-disk">
                            {/* Dark Mode Gradient */}
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0%,#450a0a_20%,#dc2626_40%,#ffffff_50%,#dc2626_60%,#450a0a_80%,transparent_100%)] blur-2xl opacity-0 dark:opacity-80 transition-opacity duration-500" />
                            {/* Light Mode Gradient (Darker reds for contrast) */}
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0%,#7f1d1d_20%,#ef4444_40%,#991b1b_50%,#ef4444_60%,#7f1d1d_80%,transparent_100%)] blur-2xl opacity-80 dark:opacity-0 mix-blend-multiply transition-opacity duration-500" />

                            {/* Inner brighter rim */}
                            <div className="absolute inset-[15%] rounded-full bg-[conic-gradient(from_180deg,transparent_0%,#991b1b_30%,#fff_50%,#991b1b_70%,transparent_100%)] blur-md opacity-90 mix-blend-normal dark:mix-blend-add" />
                        </div>
                    </div>

                    {/* 3. The Photon Ring (The thin white circle framing the shadow) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] md:w-[300px] md:h-[300px] rounded-full z-30">
                        <div className="absolute inset-0 rounded-full border-2 border-neutral-900/20 dark:border-white/90 shadow-[0_0_30px_rgba(220,38,38,0.3)] dark:shadow-[0_0_30px_rgba(255,255,255,0.8)] blur-[1px] transition-colors duration-500" />
                    </div>

                    {/* 4. The Event Horizon (The Void) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[210px] h-[210px] md:w-[290px] md:h-[290px] bg-black rounded-full z-40 shadow-[0_0_50px_rgba(0,0,0,0.5)] dark:shadow-[0_0_50px_rgba(0,0,0,1)]">
                        {/* Subtle inner glow to separate from pure black bg if needed, though usually pitch black is best */}
                    </div>

                    {/* 5. Foreground Lensing (Doppler Beaming Effect - Left side brighter) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[150px] z-50 pointer-events-none mix-blend-overlay">
                        <div className="w-full h-full bg-linear-to-r from-white/20 via-transparent to-transparent blur-3xl rounded-full" />
                    </div>

                </div>

                {/* Content Overlay */}
                <div className="col-start-1 row-start-1 relative z-50 flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto pointer-events-none">
                    <div className="space-y-4 pointer-events-auto">
                        <h2 className="text-5xl md:text-8xl font-bold text-neutral-900 dark:text-white tracking-tighter drop-shadow-xl transition-colors duration-500">
                            The Event Horizon<br />
                            <span className="text-transparent bg-clip-text bg-linear-to-b from-red-600 to-red-900 dark:from-red-500 dark:to-red-900">of Risk.</span>
                        </h2>
                    </div>

                    <p className="text-neutral-600 dark:text-neutral-400 text-lg md:text-2xl font-light tracking-wide max-w-2xl mx-auto leading-relaxed transition-colors duration-500 pointer-events-auto">
                        Nothing escapes. RedFlag monitors every transaction, state change, and anomaly in real-time. <br className="hidden md:block" />
                        <span className="text-neutral-900 dark:text-white font-normal">Total Visibility. Zero Escape.</span>
                    </p>

                    <div className="pointer-events-auto">
                        <Link href="/dashboard">
                            <Button className="h-14 px-12 bg-red-600 text-white hover:bg-red-700 text-lg rounded-full transition-all hover:scale-105 hover:shadow-[0_0_60px_-15px_rgba(220,38,38,0.5)] font-medium group relative overflow-hidden border border-red-500">
                                <span className="relative z-10 flex items-center">
                                    See the Dashboard <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .accretion-disk {
                    transform: rotateX(75deg);
                }
                @keyframes spin-disk {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-disk {
                    animation: spin-disk 12s linear infinite;
                }
                @keyframes spin-slow-reverse {
                    from { transform: translate(-50%, -50%) rotate(360deg); }
                    to { transform: translate(-50%, -50%) rotate(0deg); }
                }
                .animate-spin-slow-reverse {
                    animation: spin-slow-reverse 35s linear infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.3; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
