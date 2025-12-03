"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Code2, Lock, Search, Shield, Terminal, Zap } from "lucide-react";
import { useEffect, useState } from "react";

// --- 1. The War Room (Agents) ---
export const WarRoom = () => {
    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-900 rounded-xl">
            {/* Central Contract */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
                <Code2 className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
            </div>

            {/* Orbiting Agents */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
                    style={{ height: "100%", width: "100%" }}
                >
                    <motion.div
                        className="absolute top-1/2 left-1/2 h-8 w-8 -ml-4 -mt-4 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
                        style={{ translateX: 60 + i * 15, translateY: -60 + i * 10 }} // Offset orbits
                    >
                        {i === 0 && <Search className="h-4 w-4 text-blue-500" />}
                        {i === 1 && <Shield className="h-4 w-4 text-green-500" />}
                        {i === 2 && <Zap className="h-4 w-4 text-yellow-500" />}
                    </motion.div>
                </motion.div>
            ))}

            {/* Connecting Beams (Simulated) */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                    animate={{ rotate: [0, 360], opacity: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
                    animate={{ rotate: [360, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
            </div>
        </div>
    );
};

// --- 2. The Radar (Live Monitor) ---
export const Radar = () => {
    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-950 rounded-xl">
            {/* Grid Lines */}
            <div className="absolute inset-0 opacity-20 dark:opacity-20 opacity-10">
                <div className="absolute inset-0 border-[0.5px] border-green-500/50 dark:border-green-500/30 rounded-full scale-50" />
                <div className="absolute inset-0 border-[0.5px] border-green-500/50 dark:border-green-500/30 rounded-full scale-75" />
                <div className="absolute inset-0 border-[0.5px] border-green-500/50 dark:border-green-500/30 rounded-full scale-90" />
                <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-green-500/50 dark:bg-green-500/30" />
                <div className="absolute left-1/2 top-0 h-full w-[0.5px] bg-green-500/50 dark:bg-green-500/30" />
            </div>

            {/* Sweep */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/20 dark:via-green-500/10 to-transparent"
                style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 50%)" }} // Wedge shape approx
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute w-1/2 h-1/2 bg-gradient-to-t from-green-500/30 dark:from-green-500/20 to-transparent top-0 right-0 origin-bottom-left rounded-tr-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Blips */}
            <motion.div
                className="absolute top-1/3 right-1/3 h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 shadow-[0_0_10px_#4ade80]"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
                className="absolute bottom-1/4 left-1/3 h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 shadow-[0_0_10px_#4ade80]"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            />

            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-green-600 dark:text-green-500/80 font-bold dark:font-normal">
                LIVE MONITORING
            </div>
        </div>
    );
};

// --- 3. The Autopsy (Explainable) ---
export const Autopsy = () => {
    return (
        <div className="relative flex h-full w-full flex-col p-4 bg-white dark:bg-neutral-900 rounded-xl font-mono text-[10px] text-neutral-800 dark:text-neutral-400 overflow-hidden">
            <div className="flex gap-2 mb-2 border-b border-neutral-200 dark:border-white/10 pb-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>

            {/* Scanning Beam */}
            <motion.div
                className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent z-10"
                animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            <div className="space-y-1">
                <div className="flex gap-2">
                    <span className="text-neutral-500 dark:text-neutral-600">1</span>
                    <span className="text-purple-600 dark:text-purple-400">public fun</span>
                    <span className="text-blue-600 dark:text-blue-400">transfer</span>(...) &#123;
                </div>
                <div className="flex gap-2 relative">
                    <span className="text-neutral-500 dark:text-neutral-600">2</span>
                    <span className="text-neutral-700 dark:text-neutral-300">  let coin = coin::take(...);</span>
                </div>
                <motion.div
                    className="flex gap-2 bg-red-500/20 -mx-4 px-4 py-0.5 border-l-2 border-red-500 relative group"
                    animate={{ backgroundColor: ["rgba(239, 68, 68, 0.1)", "rgba(239, 68, 68, 0.25)", "rgba(239, 68, 68, 0.1)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span className="text-neutral-500 dark:text-neutral-600">3</span>
                    <span className="text-red-700 dark:text-red-300">  transfer::public_transfer(coin, tx_context::sender(ctx));</span>

                    {/* Tooltip */}
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{
                            opacity: 1,
                            y: [0, -4, 0],
                            scale: 1
                        }}
                        transition={{
                            opacity: { delay: 1, duration: 0.3 },
                            scale: { delay: 1, duration: 0.3 },
                            y: { delay: 1.3, duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute left-4 top-6 z-20 w-48 rounded-lg bg-white dark:bg-neutral-800 p-2 shadow-xl border border-neutral-200 dark:border-neutral-700"
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-neutral-900 dark:text-white font-semibold">Unsafe Transfer</p>
                                <p className="text-neutral-600 dark:text-neutral-400 leading-tight mt-1">Funds sent to sender without admin check.</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
                <div className="flex gap-2">
                    <span className="text-neutral-500 dark:text-neutral-600">4</span>
                    <span>&#125;</span>
                </div>
            </div>
        </div>
    );
};

// --- 4. The Input Scanner (On-Demand) ---
export const InputScanner = () => {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden p-4">
            <div className="w-full max-w-[200px] space-y-2">
                <div className="relative">
                    <div className="h-8 w-full rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center px-2 text-[10px] text-neutral-400 font-mono">
                        <span className="mr-1 text-neutral-500">0x</span>
                        <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: "auto" }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                            className="overflow-hidden whitespace-nowrap text-neutral-800 dark:text-neutral-200"
                        >
                            a2...f4
                        </motion.span>
                        <motion.div
                            className="h-3 w-[1px] bg-neutral-500 ml-0.5"
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                    </div>
                </div>

                <motion.div
                    className="h-6 w-full rounded bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    animate={{ scale: [1, 0.98, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                    SCAN
                </motion.div>
            </div>

            {/* Success Overlay */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, times: [0, 0.5, 0.6, 0.9, 1] }}
            >
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
            </motion.div>
        </div>
    );
};

// --- 5. The Report Generator (Instant Audit) ---
export const ReportGen = () => {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
                {/* Document */}
                <motion.div
                    className="relative h-16 w-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-sm shadow-sm flex flex-col p-1.5 gap-1"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="h-1.5 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded-sm mb-1" />
                    <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-sm" />
                    <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-sm" />
                    <div className="h-1 w-3/4 bg-neutral-100 dark:bg-neutral-800 rounded-sm" />
                    <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-sm mt-1" />
                    <div className="h-1 w-5/6 bg-neutral-100 dark:bg-neutral-800 rounded-sm" />

                    {/* Verified Stamp */}
                    <motion.div
                        className="absolute bottom-2 right-1 rotate-[-15deg] border-2 border-green-500 text-[6px] font-bold text-green-500 px-1 rounded-sm"
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
                    >
                        VERIFIED
                    </motion.div>
                </motion.div>

                {/* Download Arrow */}
                <motion.div
                    className="mt-2"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2, duration: 0.3 }}
                >
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <motion.svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                            animate={{ y: [0, 2, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" x2="12" y1="15" y2="3" />
                        </motion.svg>
                    </div>
                </motion.div>
            </div>

            {/* Scanning Beam */}
            <motion.div
                className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_#3b82f6]"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};
// --- 6. The Gauge (Scoring) ---
export const Gauge = () => {
    const [score, setScore] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setScore((prev) => (prev >= 95 ? 30 : prev + 1));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Calculate color based on score
    const getColor = (s: number) => {
        if (s < 50) return "text-red-500";
        if (s < 80) return "text-yellow-500";
        return "text-green-500";
    };

    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl">
            <div className="relative h-32 w-32 flex items-center justify-center">
                {/* Background Arc */}
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-neutral-200 dark:text-neutral-800" />
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * score) / 100}
                        strokeLinecap="round"
                        className={getColor(score)}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getColor(score)}`}>{score}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">Risk Score</span>
                </div>
            </div>
        </div>
    );
};
