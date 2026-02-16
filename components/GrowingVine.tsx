import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface GrowingVineProps {
    theme: 'earth' | 'water' | 'ether' | 'fire';
}

export const GrowingVine: React.FC<GrowingVineProps> = ({ theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Map scroll progress to path length (0 to 1)
    const pathLength = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    // SVG Paths for each theme
    const paths = {
        earth: (
            // Root/Vine structure
            <path
                d="M10,0 Q20,100 10,200 T30,400 T10,600 T40,800"
                fill="none"
                stroke="url(#earthGradient)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        ),
        fire: (
            // Jagged/Energy structure
            <path
                d="M25,0 Q35,50 15,100 T35,200 T15,300 T35,400 T15,500 T35,600 T15,700 T25,800"
                fill="none"
                stroke="url(#fireGradient)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        ),
        water: (
            // Flowing wave/kelp structure
            <path
                d="M20,0 C50,100 -10,200 20,300 S50,500 20,600 S-10,800 20,900"
                fill="none"
                stroke="url(#waterGradient)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        ),
        ether: (
            // Constellation/Geometric line structure
            <path
                d="M25,0 L25,100 L5,200 L45,300 L25,400 L25,600 L5,700 L45,800"
                fill="none"
                stroke="url(#etherGradient)"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeLinecap="round"
            />
        )
    };

    const gradients = {
        earth: (
            <linearGradient id="earthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5E3C" stopOpacity="0" />
                <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4A3728" stopOpacity="0" />
            </linearGradient>
        ),
        fire: (
            <linearGradient id="fireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF4500" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFD700" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8B0000" stopOpacity="0" />
            </linearGradient>
        ),
        water: (
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0047AB" stopOpacity="0" />
                <stop offset="50%" stopColor="#89CFF0" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </linearGradient>
        ),
        ether: (
            <linearGradient id="etherGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E6E6FA" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
        )
    };

    return (
        <div ref={containerRef} className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none z-20 hidden md:block overflow-hidden">
            <motion.svg
                viewBox="0 0 50 800"
                preserveAspectRatio="none"
                className="w-full h-full opacity-60"
                style={{ opacity }}
            >
                <defs>
                    {gradients[theme]}
                </defs>

                <motion.g style={{ pathLength }}>
                    {paths[theme]}
                </motion.g>

                {/* Decorative Leaves/Stars attached to the path (Optional, can be added for more detail) */}
            </motion.svg>
        </div>
    );
};
