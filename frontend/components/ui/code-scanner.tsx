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
        <div className="relative w-full max-w-2xl mx-auto perspective-1000">
            <motion.div
                initial={{ rotateX: 10, rotateY: -10, opacity: 0, scale: 0.9 }}
                animate={{ rotateX: 0, rotateY: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl"
            >
                {/* Window Header */}
                <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-4 py-3">
                    <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500/80" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                        <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-4 flex items-center gap-2 rounded bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
                        <FileCode className="h-3 w-3" />
                        <span>vault.move</span>
                    </div>
                </div>

                {/* Code Content */}
                <div className="relative p-4 font-mono text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    <pre className="overflow-x-auto">
                        <code>
                            {codeSnippet.split("\n").map((line, i) => (
                                <div key={i} className="relative">
                                    <span className="mr-4 inline-block w-6 select-none text-right text-neutral-300 dark:text-neutral-700">
                                        {i + 1}
                                    </span>
                                    <span
                                        className={
                                            i === 20 || i === 21 // Highlight risky lines
                                                ? "bg-red-500/10 text-red-600 dark:text-red-400 px-1 rounded"
                                                : ""
                                        }
                                    >
                                        {line}
                                    </span>
                                </div>
                            ))}
                        </code>
                    </pre>

                    {/* Scanning Line */}
                    <motion.div
                        initial={{ top: 0, opacity: 1 }}
                        animate={{ top: "100%", opacity: 0 }}
                        transition={{ duration: 2.5, ease: "linear", repeat: Infinity, repeatDelay: 3 }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                    />
                </div>

                {/* Status Overlay */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: scanned ? 1 : 0, y: scanned ? 0 : 10 }}
                    className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 shadow-lg dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-400 backdrop-blur-md"
                >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Critical Vulnerability Found</span>
                </motion.div>
            </motion.div>

            {/* Background Glow */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-red-500/20 via-transparent to-blue-500/20 blur-2xl opacity-50" />
        </div>
    );
};
