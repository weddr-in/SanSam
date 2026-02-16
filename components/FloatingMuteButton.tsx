import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeX } from 'lucide-react';

interface FloatingMuteButtonProps {
    isMuted: boolean;
    toggleMute: () => void;
}

export const FloatingMuteButton: React.FC<FloatingMuteButtonProps> = ({ isMuted, toggleMute }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show button only if NOT muted and scrolled past 500px
            if (!isMuted && window.scrollY > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Trigger once on mount/update to ensure correct state
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMuted]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.3 }}
                    onClick={toggleMute}
                    className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-50 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white/20 hover:scale-105 transition-all group"
                    aria-label="Mute Music"
                >
                    <VolumeX size={24} className="group-hover:text-red-400 transition-colors" />
                    <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Mute Music
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
};
