import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Leaf, Sparkles, Utensils, Heart } from 'lucide-react';

export const PurposesSection: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const yContent = useTransform(scrollYProgress, [0, 1], [30, -30]);
    const opacityContent = useTransform(scrollYProgress, [0.1, 0.3, 0.8, 1], [0, 1, 1, 0]);

    return (
        <section
            ref={containerRef}
            // Changed h-screen to min-h-screen and added padding for mobile to prevent cutoff
            className="relative min-h-screen w-full bg-[#1a1410] overflow-hidden flex items-center justify-center py-20 md:py-0"
        >
            {/* 1. WARM BROWN GRADIENT BACKGROUND */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c241b] via-[#1a1410] to-[#0f0c0a]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] pointer-events-none mix-blend-overlay" />

            {/* Ambient Glows */}
            <div className="absolute top-[-10%] right-[10%] w-[50vw] h-[50vw] bg-[#B76E79]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-10%] left-[10%] w-[60vw] h-[60vw] bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

            {/* 2. IMAGE LAYER - ABSOLUTE LEFT */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="relative w-full h-full"
                    style={{ opacity: opacityContent }}
                >
                    <img
                        src="https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/Sansam.png"
                        alt="Sanjana & Samartha"
                        className="absolute bottom-0 left-[-15%] md:left-[-5%] lg:left-[0%] h-[50vh] md:h-[90vh] lg:h-[95vh] w-auto max-w-none object-contain object-bottom drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-10 filter contrast-110 saturate-110 opacity-60 md:opacity-100"
                    />
                    {/* Gradient Overlays */}
                    <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/2 bg-gradient-to-t from-[#1a1410] to-transparent opacity-90 md:opacity-80" />

                    {/* Mobile Readability Gradient - Strong dark fade from bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410] via-[#1a1410]/80 to-transparent opacity-100 md:hidden z-20" />
                </motion.div>
            </div>

            {/* 3. CONTENT LAYER */}
            <div className="container mx-auto px-6 md:px-12 relative z-30 h-full flex flex-col justify-center items-end">
                <motion.div
                    style={{ y: yContent, opacity: opacityContent }}
                    className="w-full md:w-[55%] lg:w-[50%] flex flex-col justify-center space-y-8 md:space-y-10 pr-0 md:pr-12"
                >
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 opacity-60">
                            <Sparkles size={14} className="text-[#D4AF37]" />
                            <span className="font-sans text-[10px] tracking-[0.4em] uppercase text-white/80">
                                A Special Message
                            </span>
                        </div>
                        <h2 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.0] text-[#e8e0d5]">
                            Driven by Purpose,<br />
                            <span className="text-[#B76E79] italic opacity-90">Guided by Love.</span>
                        </h2>
                    </div>

                    {/* Narrative */}
                    <div className="space-y-6">
                        <p className="font-serif text-lg md:text-2xl text-[#e8e0d5]/90 leading-relaxed font-light">
                            "We consider our union something spiritual—a responsibility to lead a path of conscious living, giving back to the planet & humanity."
                        </p>

                        <p className="font-sans text-sm text-[#e8e0d5]/60 leading-loose tracking-wide max-w-lg">
                            Our wedding aligns with our principles: <span className="text-white/90 font-medium">Eco-friendly</span>, <span className="text-white/90 font-medium">Zero-waste</span>, and <span className="text-white/90 font-medium">Vegan</span>. We invite you to join hands in making this initiative a celebratory success.
                        </p>
                    </div>

                    {/* Features Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {/* Food Card */}
                        <div className="p-5 rounded-xl bg-[#2c241b]/40 border border-[#e8e0d5]/10 hover:bg-[#2c241b]/60 transition-colors backdrop-blur-sm group">
                            <div className="flex items-start justify-between mb-3">
                                <Utensils size={20} className="text-[#D4AF37]" />
                                <span className="text-[10px] font-sans uppercase tracking-wider text-[#e8e0d5]/30 group-hover:text-[#e8e0d5]/60 transition-colors">The Feast</span>
                            </div>
                            <h3 className="font-display text-xl text-[#e8e0d5] mb-1">Satvik & Vegan</h3>
                            <p className="text-xs text-[#e8e0d5]/50 leading-relaxed font-sans">
                                Multi-cuisine spreads. Pure, plant-based, and absolute delight. 😋
                            </p>
                        </div>

                        {/* Support Card */}
                        <div className="p-5 rounded-xl bg-gradient-to-br from-[#4CAF50]/10 to-transparent border border-[#4CAF50]/20 hover:border-[#4CAF50]/40 transition-colors backdrop-blur-sm">
                            <div className="flex items-start justify-between mb-3">
                                <Heart size={20} className="text-[#4CAF50]" />
                                <span className="text-[10px] font-sans uppercase tracking-wider text-[#4CAF50]/60">Your Role</span>
                            </div>
                            <h3 className="font-display text-xl text-[#e8e0d5] mb-1">Join the Cause</h3>
                            <p className="text-xs text-[#e8e0d5]/50 leading-relaxed font-sans">
                                Your support in minimizing waste makes this truly meaningful.
                            </p>
                        </div>
                    </div>

                </motion.div>
            </div>
        </section>
    );
};
