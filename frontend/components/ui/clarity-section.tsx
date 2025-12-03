"use client";

import { ArrowRight, AlertTriangle, FileCode, ShieldAlert } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useState } from "react";
import { ByteRain } from "./byte-rain";
import { DecoderText } from "./decoder-text";

export const ClaritySection = () => {
    const [isInView, setIsInView] = useState(false);

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3,
            },
        },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
            },
        },
    };

    const arrowVariants: Variants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                delay: 1.5, // Wait for some code to "type"
            },
        },
    };

    const insightCardVariants: Variants = {
        hidden: { opacity: 0, scale: 0.9, filter: "blur(10px)" },
        visible: {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            transition: {
                duration: 0.6,
                delay: 0.5, // Start showing shortly after section is in view
                type: "spring",
                bounce: 0.4,
            },
        },
    };

    const pulseVariants: Variants = {
        initial: { x: "-100%", opacity: 0 },
        animate: {
            x: "100%",
            opacity: [0, 1, 0],
            transition: {
                repeat: Infinity,
                duration: 2,
                ease: "linear",
                repeatDelay: 1,
            },
        },
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-24 md:py-32 px-6 bg-white dark:bg-black overflow-hidden">
            <motion.div
                className="text-center mb-16 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl tracking-tight">
                    Clarity in Chaos
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-lg">
                    We translate raw, opaque bytecode into instant, actionable intelligence.
                </p>
            </motion.div>

            <motion.div
                className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                onViewportEnter={() => setIsInView(true)}
            >
                {/* Left: Opaque Bytecode */}
                <motion.div className="w-full md:w-1/3 relative group" variants={cardVariants}>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative h-full bg-white dark:bg-black border border-neutral-200 dark:border-white/10 rounded-2xl p-6 dark:shadow-none shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center gap-2 mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
                            <FileCode className="h-5 w-5 text-neutral-400" />
                            <span className="text-sm font-mono text-neutral-500">contract.move</span>
                        </div>
                        <div className="relative h-64 md:h-80 w-full font-mono text-xs md:text-sm text-neutral-400 dark:text-neutral-500">
                            <div className="relative h-64 md:h-80 w-full font-mono text-xs md:text-sm text-neutral-400 dark:text-neutral-500">
                                <ByteRain infinite />
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black via-transparent to-transparent opacity-90 dark:opacity-0"></div>
                        <div className="absolute bottom-6 left-0 right-0 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                                <DecoderText text="Live Analysis Stream" start={isInView} delay={0.5} />
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Center: Arrow */}
                <motion.div
                    className="flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600 relative"
                    variants={arrowVariants}
                >
                    <div className="relative">
                        <ArrowRight className="h-8 w-8 md:h-12 md:w-12 rotate-90 md:rotate-0" />
                        {/* Energy Pulse Effect inside the arrow (simulated by a masking overlay or just a sibling for simplicity) */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50 blur-sm"
                            variants={pulseVariants}
                            initial="initial"
                            animate="animate"
                            style={{ mixBlendMode: "overlay" }}
                        />
                    </div>
                </motion.div>

                {/* Right: Obvious Insight */}
                <motion.div
                    className="w-full md:w-1/3 relative"
                    variants={insightCardVariants}
                >
                    {/* Stronger Glow - Adjusted for Dark Mode */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur-lg opacity-20 dark:opacity-30 animate-pulse"></div>

                    {/* Glassmorphism Card - Refined */}
                    <div className="relative h-full bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl border border-red-500/20 dark:border-red-500/30 rounded-2xl p-6 shadow-2xl shadow-red-500/10 overflow-hidden">

                        {/* Scanline Overlay - Subtle */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] dark:bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] z-10"></div>
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-red-500/5 to-transparent z-10"></div>
                        <div className="flex items-center justify-between mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                    <DecoderText text="Critical Risk" start={isInView} delay={1} />
                                </span>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">
                                <DecoderText text="Score: 98/100" start={isInView} delay={1.2} />
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">
                                    <DecoderText text="Rug Pull Logic Detected" start={isInView} delay={1.5} />
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    <DecoderText
                                        text="Function emergency_withdraw allows the owner to drain all user funds without a timelock."
                                        start={isInView}
                                        delay={2}
                                    />
                                </p>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-red-700 dark:text-red-300">
                                        <strong>Recommendation:</strong>{" "}
                                        <DecoderText
                                            text="Implement a 48h Timelock or remove the privileged withdrawal capability."
                                            start={isInView}
                                            delay={2.5}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
