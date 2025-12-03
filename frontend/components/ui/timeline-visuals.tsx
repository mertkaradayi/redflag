"use client";

import { FileCode2, Users, CheckCircle2, FileText, Server } from "lucide-react";

export const IngestVisual = () => {
    return (
        <div className="relative h-48 w-full rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center">
            <div className="flex items-center gap-4">
                {/* Static File Icons */}
                <div className="h-10 w-8 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm flex items-center justify-center transform -rotate-6">
                    <FileCode2 className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="h-10 w-8 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm flex items-center justify-center transform rotate-3 z-10">
                    <FileCode2 className="h-5 w-5 text-neutral-500" />
                </div>
                <div className="h-10 w-8 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm flex items-center justify-center transform -rotate-3">
                    <FileCode2 className="h-5 w-5 text-neutral-400" />
                </div>

                {/* Arrow */}
                <div className="w-8 h-[1px] bg-neutral-300 dark:bg-neutral-700" />

                {/* Server Icon */}
                <div className="h-12 w-12 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <Server className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
                </div>
            </div>
        </div>
    );
};

export const CollaborateVisual = () => {
    return (
        <div className="relative h-48 w-full rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center">
            {/* Static Network Graph */}
            <div className="relative">
                {/* Hub */}
                <div className="relative z-10 h-12 w-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <Users className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
                </div>

                {/* Nodes */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-neutral-200 dark:border-neutral-800 rounded-full" />

                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
            </div>
        </div>
    );
};

export const DeliverVisual = () => {
    return (
        <div className="relative h-48 w-full rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center">
            <div className="relative h-24 w-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm flex flex-col items-center p-3">
                <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded mb-2" />
                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1" />
                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1" />
                <div className="w-3/4 h-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1" />
                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1 mt-2" />
                <div className="w-1/2 h-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1" />

                <div className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-md border-2 border-white dark:border-neutral-900">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
            </div>
        </div>
    );
};
