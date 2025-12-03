"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FileCode, Shield, Terminal } from "lucide-react";

const codeSnippet = `module redflag::vault {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};

    struct Vault<phantom T> has key {
        id: UID,
        cash: Balance<T>,
        admin: address
    }

    /// Withdraw funds from the vault
    public fun withdraw<T>(
        vault: &mut Vault<T>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // CRITICAL: Missing admin check!
        // assert!(tx_context::sender(ctx) == vault.admin, ENotAdmin);
        
        let cash = coin::take(&mut vault.cash, amount, ctx);
        transfer::public_transfer(cash, tx_context::sender(ctx));
    }
}`;

export const CodeScanner = () => {
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setScanned(true);
        }, 2500); // Scan completes after 2.5s
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full max-w-4xl mx-auto perspective-1000 group">
            <motion.div
                initial={{ rotateX: 5, opacity: 0, scale: 0.95 }}
                animate={{ rotateX: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative overflow-hidden rounded-xl border border-neutral-200/60 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-2xl"
            >
                {/* Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 pointer-events-none z-10" />

                {/* Window Header */}
                <div className="relative z-20 flex items-center justify-between border-b border-neutral-200/60 dark:border-white/10 bg-neutral-50/80 dark:bg-neutral-900/80 px-4 py-3 backdrop-blur-sm">
                    <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                        <div className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                        <div className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-md bg-neutral-200/50 dark:bg-neutral-800/50 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-white/5">
                        <FileCode className="h-3.5 w-3.5" />
                        <span>vault.move</span>
                    </div>
                    <div className="w-16" /> {/* Spacer for balance */}
                </div>

                {/* Code Content */}
                <div className="relative p-6 font-mono text-[13px] sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 bg-white/40 dark:bg-transparent text-left">
                    <pre className="overflow-x-auto scrollbar-hide w-full">
                        <code className="block w-full">
                            {codeSnippet.split("\n").map((line, i) => {
                                // Identify risky lines (CRITICAL comment and the commented-out assert)
                                const isRisky = line.includes("CRITICAL") || line.includes("assert");
                                
                                // Tokenize and highlight
                                const highlightLine = (text: string) => {
                                    if (text.trim().startsWith("//")) {
                                        return <span className="text-neutral-400 dark:text-neutral-500 italic">{text}</span>;
                                    }

                                    // Split by separators but keep them
                                    const parts = text.split(/([a-zA-Z0-9_]+|[{}()<>:,.;=])/g);
                                    
                                    return parts.map((part, index) => {
                                        if (!part) return null;
                                        
                                        // Keywords
                                        if (/^(module|use|struct|public|fun|let|mut|has|key|phantom|const)$/.test(part)) {
                                            return <span key={index} className="text-purple-600 dark:text-purple-400 font-medium">{part}</span>;
                                        }
                                        // Types / Structs
                                        if (/^(UID|Balance|Coin|TxContext|Vault|T|Self|u64|address)$/.test(part)) {
                                            return <span key={index} className="text-yellow-600 dark:text-yellow-300">{part}</span>;
                                        }
                                        // Functions
                                        if (/^(transfer|take|public_transfer|sender|withdraw)$/.test(part)) {
                                            return <span key={index} className="text-blue-600 dark:text-blue-400">{part}</span>;
                                        }
                                        // Numbers
                                        if (/^\d+$/.test(part)) {
                                            return <span key={index} className="text-orange-600 dark:text-orange-400">{part}</span>;
                                        }
                                        // Punctuation
                                        if (/^[{}()<>:,.;=]+$/.test(part) || part === "::") {
                                            return <span key={index} className="text-neutral-500 dark:text-neutral-400">{part}</span>;
                                        }
                                        
                                        return <span key={index} className="text-neutral-800 dark:text-neutral-200">{part}</span>;
                                    });
                                };

                                return (
                                    <div key={i} className="relative group/line flex">
                                        <span className="mr-6 inline-block w-6 shrink-0 select-none text-right text-neutral-300 dark:text-neutral-700/80 group-hover/line:text-neutral-400 dark:group-hover/line:text-neutral-500 transition-colors">
                                            {i + 1}
                                        </span>
                                        <span
                                            className={
                                                isRisky
                                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 px-1 -mx-1 rounded relative z-0 font-medium w-full"
                                                    : ""
                                            }
                                        >
                                            {isRisky ? line : highlightLine(line)}
                                        </span>
                                    </div>
                                );
                            })}
                        </code>
                    </pre>

                    {/* Scanning Line */}
                    <motion.div
                        initial={{ top: -20, opacity: 0 }}
                        animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 3, ease: "linear", repeat: Infinity, repeatDelay: 2 }}
                        className="absolute left-0 right-0 z-10"
                    >
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
                        <div className="h-24 w-full bg-gradient-to-b from-red-500/10 to-transparent" />
                    </motion.div>
                </div>

                {/* Status Overlay */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: scanned ? 1 : 0, y: scanned ? 0 : 20, scale: scanned ? 1 : 0.9 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="absolute bottom-6 right-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-white/90 dark:bg-neutral-900/90 px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-neutral-900 dark:text-white font-semibold">Critical Vulnerability</span>
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs">Missing admin check detected</span>
                    </div>
                    <motion.div
                        className="absolute inset-0 rounded-xl border border-red-500/50"
                        animate={{ opacity: [0, 1, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.div>
            </motion.div>

            {/* Background Glow */}
            <div className="absolute -inset-8 -z-10 bg-gradient-to-tr from-red-500/10 via-purple-500/10 to-blue-500/10 blur-3xl opacity-50 dark:opacity-30 rounded-[3rem]" />
        </div>
    );
};
