"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface ByteRainProps {
    targetCode?: string;
    onComplete?: () => void;
    className?: string;
    infinite?: boolean;
}

export const ByteRain = ({ targetCode = "", onComplete, className, infinite = false }: ByteRainProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme, resolvedTheme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Configuration
        const fontSize = 14;
        const lineHeight = 20;
        const font = "monospace";

        // Colors
        const isDark = resolvedTheme === "dark" || theme === "dark";
        const bgClearColor = isDark ? "#000000" : "#ffffff";
        const charColor = isDark ? "#404040" : "#d4d4d4"; // Faint for chaos
        const codeColor = isDark ? "#e5e5e5" : "#171717"; // Bright for resolved code
        const highlightColor = "#ef4444"; // Red for specific keywords

        // Resize handler
        const resize = () => {
            if (!container) return;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // The Target Code (Move)
        const targetLines = [
            "public entry fun emergency_withdraw(",
            "    _: &AdminCap,",
            "    vault: &mut Vault,",
            "    ctx: &mut TxContext",
            ") {",
            "    let balance = vault.balance.value();",
            "    transfer::public_transfer(",
            "        coin::take(&mut vault.balance, balance, ctx),",
            "        tx_context::sender(ctx)",
            "    );",
            "}"
        ];

        // Grid State
        const rows = Math.floor(canvas.height / lineHeight);
        const cols = Math.floor(canvas.width / (fontSize * 0.6)); // Approx char width

        interface Cell {
            char: string;
            targetChar: string | null;
            isLocked: boolean;
            x: number;
            y: number;
        }

        const grid: Cell[] = [];

        // Initialize Grid
        // Center the code vertically
        const startRow = Math.floor((rows - targetLines.length) / 2);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let targetChar = null;

                // Map target code to grid
                if (r >= startRow && r < startRow + targetLines.length) {
                    const lineIndex = r - startRow;
                    const line = targetLines[lineIndex];
                    if (c < line.length) {
                        targetChar = line[c];
                    }
                }

                grid.push({
                    char: Math.random().toString(36).substring(2, 3), // Random char
                    targetChar,
                    isLocked: false,
                    x: c * (fontSize * 0.6),
                    y: r * lineHeight + lineHeight
                });
            }
        }

        let frameId: number;
        let frameCount = 0;

        // Animation Loop
        const draw = () => {
            ctx.fillStyle = bgClearColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${fontSize}px ${font}`;

            // 1. Update Grid
            // Randomly change unlocked chars
            // Gradually lock chars based on frameCount

            const lockProbability = Math.min(1, Math.max(0, (frameCount - 50) / 300)); // Start locking after 50 frames, finish by 350

            grid.forEach(cell => {
                if (cell.isLocked) {
                    // Draw locked char
                    ctx.fillStyle = codeColor;

                    // Highlight specific keywords if locked
                    if (["fun", "entry", "public", "let"].includes(cell.char)) {
                        // Simple keyword detection is hard per-char. 
                        // Let's just keep it simple for now.
                    }

                    if (cell.char) ctx.fillText(cell.char, cell.x, cell.y);
                } else {
                    // Chaos
                    if (Math.random() > 0.9) {
                        cell.char = Math.random().toString(36).substring(2, 3); // Change char
                    }

                    // Attempt to lock
                    if (cell.targetChar && Math.random() < lockProbability) {
                        cell.char = cell.targetChar;
                        cell.isLocked = true;
                    }

                    // Draw chaos char
                    // Only draw some chaos chars to keep it clean (sparse)
                    if (Math.random() > 0.7) {
                        ctx.fillStyle = charColor;
                        ctx.fillText(cell.char, cell.x, cell.y);
                    }
                }
            });

            frameCount++;

            // Loop?
            if (frameCount > 500 && infinite) {
                // Reset to chaos
                frameCount = 0;
                grid.forEach(cell => cell.isLocked = false);
            }

            frameId = requestAnimationFrame(draw);
        };

        frameId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(frameId);
        };
    }, [theme, resolvedTheme, infinite]);

    return (
        <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};
