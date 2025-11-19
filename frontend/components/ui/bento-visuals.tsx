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
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950 rounded-xl">
            {/* Grid Lines */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 border-[0.5px] border-green-500/30 rounded-full scale-50" />
                <div className="absolute inset-0 border-[0.5px] border-green-500/30 rounded-full scale-75" />
                <div className="absolute inset-0 border-[0.5px] border-green-500/30 rounded-full scale-90" />
                <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-green-500/30" />
                <div className="absolute left-1/2 top-0 h-full w-[0.5px] bg-green-500/30" />
            </div>

            {/* Sweep */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent"
                style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 50%)" }} // Wedge shape approx
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute w-1/2 h-1/2 bg-gradient-to-t from-green-500/20 to-transparent top-0 right-0 origin-bottom-left rounded-tr-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Blips */}
            <motion.div
                className="absolute top-1/3 right-1/3 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
                className="absolute bottom-1/4 left-1/3 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            />

            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-green-500/80">
                LIVE MONITORING
            </div>
        </div>
    );
};

// --- 3. The Autopsy (Explainable) ---
export const Autopsy = () => {
    return (
        <div className="relative flex h-full w-full flex-col p-4 bg-neutral-900 rounded-xl font-mono text-[10px] text-neutral-400 overflow-hidden">
            <div className="flex gap-2 mb-2 border-b border-white/10 pb-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>

            <div className="space-y-1">
                <div className="flex gap-2">
                    <span className="text-neutral-600">1</span>
                    <span className="text-purple-400">public fun</span>
                    <span className="text-blue-400">transfer</span>(...) &#123;
                </div>
                <div className="flex gap-2 relative">
                    <span className="text-neutral-600">2</span>
                    <span className="text-neutral-300">  let coin = coin::take(...);</span>
                </div>
                <div className="flex gap-2 bg-red-500/20 -mx-4 px-4 py-0.5 border-l-2 border-red-500 relative group">
                    <span className="text-neutral-600">3</span>
                    <span className="text-red-300">  transfer::public_transfer(coin, tx_context::sender(ctx));</span>

                    {/* Tooltip */}
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                        className="absolute left-4 top-6 z-20 w-48 rounded-lg bg-neutral-800 p-2 shadow-xl border border-neutral-700"
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-white font-semibold">Unsafe Transfer</p>
                                <p className="text-neutral-400 leading-tight mt-1">Funds sent to sender without admin check.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <div className="flex gap-2">
                    <span className="text-neutral-600">4</span>
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

// --- 5. The Dependency Graph (Deep Scan) ---
export const DependencyGraph = () => {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden">
            {/* Central Node */}
            <div className="relative z-10 h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 flex items-center justify-center shadow-sm">
                <div className="h-3 w-3 rounded-full bg-neutral-400" />
            </div>

            {/* Child Nodes */}
            {[0, 1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="absolute h-24 w-24"
                    style={{
                        transform: `rotate(${i * 90 + 45}deg)`,
                        transformOrigin: "center"
                    }}
                >
                    {/* Connection */}
                    <div className="absolute top-1/2 left-1/2 h-[1px] w-1/2 bg-neutral-300 dark:bg-neutral-700 origin-left -translate-y-1/2" />

                    {/* Node */}
                    <motion.div
                        className={`absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm bg-white dark:bg-neutral-800 ${i === 1 ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'}`}
                        style={{ transform: `rotate(-${i * 90 + 45}deg)` }}
                    >
                        <div className={`h-2 w-2 rounded-full ${i === 1 ? 'bg-red-500' : 'bg-neutral-400'}`} />
                    </motion.div>

                    {/* Alert for Risk Node */}
                    {i === 1 && (
                        <motion.div
                            className="absolute right-0 top-0 -translate-y-full -translate-x-1/2"
                            style={{ transform: `rotate(-${i * 90 + 45}deg) translateY(-10px)` }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1, duration: 0.3 }}
                        >
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                        </motion.div>
                    )}
                </div>
            ))}
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
