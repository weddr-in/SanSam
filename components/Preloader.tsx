import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PreloaderProps {
    isLoading: boolean;
}

export const Preloader: React.FC<PreloaderProps> = ({ isLoading }) => {
    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    key="preloader"
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black"
                    exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                >
                    <div className="flex flex-col items-center gap-8">
                        {/* Metallic Text */}
                        <motion.h1
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="font-display text-5xl md:text-7xl tracking-widest liquid-chrome"
                            style={{
                                fontStyle: 'italic'
                            }}
                        >
                            #SanSam
                        </motion.h1>

                        {/* Spinner & Text */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="flex flex-row items-center gap-3"
                        >
                            <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/40">
                                Loading Experience
                            </span>
                            <Loader2 className="w-4 h-4 text-silver animate-spin opacity-50" />
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
