"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DecoderTextProps {
    text: string;
    className?: string;
    delay?: number;
    start?: boolean;
}

const chars = "0123456789ABCDEF";

export const DecoderText = ({ text, className, delay = 0, start = true }: DecoderTextProps) => {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!start) return;

        let frameId: number;
        let frameCount = 0;
        const maxFrames = 30; // Duration of scramble per character group

        // We want to resolve the text character by character or in chunks.
        // Let's do a simple scramble effect where the whole string is scrambled
        // and then characters resolve from left to right.

        const resolveSpeed = 2; // Frames per character resolution

        const animate = () => {
            if (frameCount < delay * 60) { // Wait for delay (approx 60fps)
                frameCount++;
                frameId = requestAnimationFrame(animate);
                return;
            }

            const progress = Math.max(0, frameCount - (delay * 60));
            const resolvedCount = Math.floor(progress / resolveSpeed);

            if (resolvedCount >= text.length) {
                setDisplayText(text);
                setIsComplete(true);
                return;
            }

            let currentText = "";
            for (let i = 0; i < text.length; i++) {
                if (i < resolvedCount) {
                    currentText += text[i];
                } else {
                    // Preserve spaces for word wrapping
                    if (text[i] === " ") {
                        currentText += " ";
                    } else {
                        // Random char
                        currentText += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
            }

            setDisplayText(currentText);
            frameCount++;
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameId);
    }, [text, delay, start]);

    return (
        <span className={className}>
            {displayText || (start ? "" : text)}
            {/* If not started, maybe show nothing or full text? 
                User wants it to "build", so probably show nothing or scrambled initially.
                Let's show nothing if not started to avoid layout shifts, or use a placeholder.
                Actually, better to just handle 'start' to trigger animation.
            */}
        </span>
    );
};
