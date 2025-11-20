"use client";

import { ArrowRight, AlertTriangle, CheckCircle2, FileCode, ShieldAlert } from "lucide-react";

export const ClaritySection = () => {
    return (
        <div className="w-full max-w-6xl mx-auto mt-32 mb-32 px-6">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl font-bold text-foreground dark:text-white md:text-5xl tracking-tight">
                    Clarity in Chaos
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-lg">
                    We translate raw, opaque bytecode into instant, actionable intelligence.
                </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
                {/* Left: Opaque Bytecode */}
                <div className="w-full md:w-1/3 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                            <FileCode className="h-5 w-5 text-neutral-400" />
                            <span className="text-sm font-mono text-neutral-500">contract.bytecode</span>
                        </div>
                        <div className="font-mono text-xs md:text-sm text-neutral-400 dark:text-neutral-500 space-y-1 break-all opacity-70">
                            <p>0x608060405234801561001057600080fd5b5061</p>
                            <p>012a806100206000396000f3fe60806040523480</p>
                            <p>1561001057600080fd5b506004361061002b5760</p>
                            <p>003560e01c8063a9059cbb14610030575b600080</p>
                            <p>fd5b61003861004e565b60405180828152602001</p>
                            <p>91505060405180910390f35b6000600190509056</p>
                            <p>fea2646970667358221220d90fbc61002b576000</p>
                            <p>...</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-transparent to-transparent opacity-90"></div>
                        <div className="absolute bottom-6 left-0 right-0 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                                Raw Bytecode
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: Arrow */}
                <div className="flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600">
                    <ArrowRight className="h-8 w-8 md:h-12 md:w-12 rotate-90 md:rotate-0" />
                </div>

                {/* Right: Obvious Insight */}
                <div className="w-full md:w-1/3 relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                    <div className="relative h-full bg-white dark:bg-neutral-900 border border-red-500/20 dark:border-red-500/30 rounded-2xl p-6 shadow-xl shadow-red-500/5">
                        <div className="flex items-center justify-between mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Critical Risk</span>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">Score: 98/100</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">
                                    Rug Pull Logic Detected
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Function <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-red-500">emergency_withdraw</code> allows the owner to drain all user funds without a timelock.
                                </p>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-red-700 dark:text-red-300">
                                        <strong>Recommendation:</strong> Implement a 48h Timelock or remove the privileged withdrawal capability.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
