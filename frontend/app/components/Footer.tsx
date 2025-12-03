"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter, DiscIcon as Discord, ArrowRight } from "lucide-react";
import BrandLogo from "./BrandLogo";

const footerLinks = {
    product: [
        { name: "Analyze", href: "/analyze" },
        { name: "Deployments", href: "/dashboard" },
        { name: "Dashboard", href: "/soon" },
        { name: "API Access", href: "/soon" },
    ],
    resources: [
        { name: "Documentation", href: "/soon" },
        { name: "Blog", href: "/soon" },
        { name: "Sui Ecosystem", href: "https://sui.io" },
        { name: "Risk Methodology", href: "/soon" },
    ],
    project: [
        { name: "About", href: "/soon" },
        { name: "Team", href: "/soon" },
        { name: "Hackathon", href: "/soon" },
    ],
};

const socialLinks = [
    { name: "GitHub", href: "https://github.com/mertkaradayi/redflag", icon: Github },
    { name: "Twitter", href: "https://x.com/RedFlagSui", icon: Twitter },
    { name: "Discord", href: "https://discord.com", icon: Discord },
];

export default function Footer() {
    return (
        <footer className="relative border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-black pt-16 pb-8 overflow-hidden">
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] -z-10" />

            <div className="mx-auto max-w-6xl px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <BrandLogo className="h-8" wrapperClassName="inline-block" />
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed max-w-xs">
                            RedFlag is the autonomous risk engine for Sui. We analyze every contract deployment in real-time to keep the ecosystem safe.
                        </p>
                        <div className="flex items-center gap-4">
                            {socialLinks.map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <social.icon className="h-4 w-4" />
                                    <span className="sr-only">{social.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Product</h3>
                            <ul className="space-y-3">
                                {footerLinks.product.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors inline-flex items-center group"
                                        >
                                            {link.name}
                                            <ArrowRight className="h-3 w-3 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Resources</h3>
                            <ul className="space-y-3">
                                {footerLinks.resources.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors inline-flex items-center group"
                                        >
                                            {link.name}
                                            <ArrowRight className="h-3 w-3 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Project</h3>
                            <ul className="space-y-3">
                                {footerLinks.project.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors inline-flex items-center group"
                                        >
                                            {link.name}
                                            <ArrowRight className="h-3 w-3 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-neutral-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                        © {new Date().getFullYear()} RedFlag Labs. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                All Systems Operational
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
