import React, { useState } from 'react';
import { CinematicHero } from '../../components/CinematicHero';
import { Hero } from '../../components/Hero';
import { EventSection } from '../../components/EventSection';

import { Guestbook } from '../../components/Guestbook';
import { TileScrollGallery } from '../../components/TileScrollGallery';
import { GameSection } from '../../components/GameSection';
import { FloatingMuteButton } from '../../components/FloatingMuteButton';
import { Preloader } from '../../components/Preloader';
import { MusicSection } from '../../components/MusicSection';
import { AIConciergeFAB } from '../../components/AIConciergeFAB';
import { PurposesSection } from '../../components/PurposesSection';


import { EventDetails } from '../../types';
import { Sun, Moon, Star, ArrowUpRight, Instagram, Music } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const EVENTS: EventDetails[] = [
    {
        id: 'reception',
        title: 'Reception',
        subtitle: 'Evening Elegance',
        date: '24.03.26',
        time: '5:30 PM Onwards',
        location: 'Kalyani Courtyard - Reception Arena',
        mapsLink: 'https://maps.app.goo.gl/NX1AvDJwZVrC7zwy7',
        theme: 'evening',
        colorHex: '#B76E79',
        palette: ['#000000', '#000080', '#013220'], // Black, Navy Blue, Dark Green
        icon: <Moon size={24} strokeWidth={1} />,
        outfit: {
            type: "Western Wear",
            description: "Gowns, suits, tuxedos etc.",
            colors: "Dark colors like black / navy blue / dark green.",
            avoid: "Please avoid dark brown."
        }
    },
    {
        id: 'wedding',
        title: 'Wedding',
        subtitle: 'Sacred Dawn',
        date: '25.03.26',
        time: '9:00 AM Onwards',
        location: 'Kalyani Courtyard - Wedding House',
        mapsLink: 'https://maps.app.goo.gl/NX1AvDJwZVrC7zwy7',
        theme: 'sacred',
        colorHex: '#D4AF37',
        palette: ['#FFB6C1', '#FF0000', '#800000', '#800080', '#E6E6FA', '#FFC0CB', '#FFFF00'], // Pastels, Red, Maroon, Purple, Lavender, Pink, Yellow
        icon: <Sun size={24} strokeWidth={1} />,
        outfit: {
            type: "Ethnic Wear",
            description: "Traditional Indian ethnic wear.",
            colors: "Pastel colors, red, maroon, purple, lavender, pink, yellow.",
            avoid: "Please avoid whites and off-whites."
        }
    }
];

export const Home: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const [isMuted, setIsMuted] = useState(true);

    // --- Preloader State ---
    const [isLoading, setIsLoading] = useState(true);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isPageLoaded, setIsPageLoaded] = useState(false);
    const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);

    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);

    // 0. Mobile Check
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        // Initial check
        checkMobile();

        // Debounced listener could be better, but simple resize is fine for now
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 1. Minimum Aesthetic Duration (2.5s)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsMinTimeElapsed(true);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    // 2. Page Load Detection
    React.useEffect(() => {
        if (document.readyState === 'complete') {
            setIsPageLoaded(true);
        } else {
            const handleLoad = () => setIsPageLoaded(true);
            window.addEventListener('load', handleLoad);
            return () => window.removeEventListener('load', handleLoad);
        }
    }, []);

    // 3. Safety Timeout (12s) - Allow enough time for video (10s) before forcing load
    React.useEffect(() => {
        const safetyTimer = setTimeout(() => {
            setIsLoading(false);
        }, 12000);
        return () => clearTimeout(safetyTimer);
    }, []);

    // 4. Combine Conditions to Finish Loading
    React.useEffect(() => {
        if (isVideoReady && isPageLoaded && isMinTimeElapsed) {
            setIsLoading(false);
        }
    }, [isVideoReady, isPageLoaded, isMinTimeElapsed]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <main className={`min-h-screen text-white selection:bg-white/20 selection:text-white ${isLoading ? 'h-screen overflow-hidden' : 'overflow-x-hidden'}`} style={{ background: 'linear-gradient(to bottom, #0a0a0a 0%, #1a1410 50%, #0f0d0c 100%)' }}>

            <Preloader isLoading={isLoading} />

            {/* Cinematic Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-[2px] bg-white z-[100] origin-left mix-blend-difference opacity-50"
                style={{ scaleX }}
            />

            {isMobile ? (
                <Hero isMuted={isMuted} toggleMute={toggleMute} onVideoReady={() => setIsVideoReady(true)} />
            ) : (
                <CinematicHero isMuted={isMuted} toggleMute={toggleMute} onVideoReady={() => setIsVideoReady(true)} />
            )}

            <FloatingMuteButton isMuted={isMuted} toggleMute={toggleMute} />

            {/* AI Wedding Concierge */}
            <AIConciergeFAB />

            {/* Background Music - Disabled as video now has its own audio */}
            {/* <BackgroundMusic isMuted={isMuted} /> */}

            {/* Events Section */}
            <section id="itinerary" className="relative z-20">
                {EVENTS.map((event, index) => (
                    <EventSection key={event.id} event={event} index={index} />
                ))}
            </section>

            {/* Purposes of SanSam */}
            <PurposesSection />



            <div id="guestbook">
                <Guestbook />
            </div>

            <div id="gallery">
                <TileScrollGallery />
            </div>

            <GameSection />

            <MusicSection />

            {/* Aesthetic Footer */}
            <footer className="relative text-white pt-20 pb-10 overflow-hidden border-t border-white/5" style={{ background: 'linear-gradient(to bottom, #0f0d0c 0%, #050505 100%)' }}>

                {/* Ambient Background Gradient - Rose Gold Glow */}
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(183, 110, 121, 0.08) 0%, transparent 70%)' }} />

                {/* Scrolling Marquee - Interactive (pauses on hover/touch) */}
                <div
                    className="w-full overflow-hidden opacity-[0.03] mb-12 select-none group"
                    onMouseEnter={(e) => {
                        const marquee = e.currentTarget.querySelector('.animate-marquee') as HTMLElement;
                        if (marquee) marquee.style.animationPlayState = 'paused';
                    }}
                    onMouseLeave={(e) => {
                        const marquee = e.currentTarget.querySelector('.animate-marquee') as HTMLElement;
                        if (marquee) marquee.style.animationPlayState = 'running';
                    }}
                    onTouchStart={(e) => {
                        const marquee = e.currentTarget.querySelector('.animate-marquee') as HTMLElement;
                        if (marquee) marquee.style.animationPlayState = 'paused';
                    }}
                    onTouchEnd={(e) => {
                        const marquee = e.currentTarget.querySelector('.animate-marquee') as HTMLElement;
                        if (marquee) marquee.style.animationPlayState = 'running';
                    }}
                >
                    <div className="animate-marquee whitespace-nowrap flex gap-12 cursor-pointer">
                        {[1, 2, 3, 4].map((i) => (
                            <span key={i} className="font-display text-[8rem] md:text-[12rem] leading-none text-white group-hover:opacity-10 transition-opacity">
                                SANJANA & SAMARTHA
                            </span>
                        ))}
                    </div>
                </div>

                <div className="container mx-auto px-6 md:px-12 relative z-10">

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                        {/* Column 1: Statement */}
                        <div className="md:col-span-2">
                            <h3 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
                                Thank you for being part of our sacred journey.
                            </h3>
                            <p className="font-serif italic text-white/50 text-lg max-w-sm">
                                "Two souls united in spiritual companionship."
                            </p>
                        </div>

                        {/* Column 2: Quick Links */}
                        <div className="flex flex-col gap-4 pt-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-2">Navigation</span>
                            {['The Film', 'Itinerary', 'Guestbook', 'Gallery'].map((link) => (
                                <button
                                    key={link}
                                    onClick={() => {
                                        if (link === 'The Film') {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        } else {
                                            const id = link.toLowerCase();
                                            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className="font-sans text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors w-fit text-left"
                                >
                                    {link}
                                </button>
                            ))}
                        </div>

                        {/* Column 3: Connect & RSVP */}
                        <div className="flex flex-col gap-6 pt-2">
                            <div className="flex flex-col gap-4">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-2">Socials</span>
                                <a href="#" className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors w-fit group">
                                    <Instagram size={14} />
                                    <span>@SanjanaWedsSamartha</span>
                                </a>
                                <a href="#" className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors w-fit group">
                                    <Music size={14} />
                                    <span>Wedding Playlist</span>
                                </a>
                            </div>

                            <button
                                onClick={() => navigate('/rsvp')}
                                className="mt-4 px-8 py-4 bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all duration-500 rounded-sm w-fit group"
                            >
                                <span className="font-sans text-[10px] tracking-[0.3em] uppercase flex items-center gap-3">
                                    RSVP Now
                                    <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Branding Partners */}
                    <div className="border-t border-white/5 pt-8 mb-8">
                        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                            {/* Built by Weddr */}
                            <a
                                href="https://weddr.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">Built by</span>
                                <img
                                    src="https://www.weddr.in/assets/Weddr_logo-1hHXisfi.png"
                                    alt="Weddr"
                                    className="h-8 md:h-10 object-contain filter brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all"
                                />
                            </a>
                        </div>
                    </div>

                    {/* Footer Bottom */}
                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm">
                                S
                            </div>
                            <span className="font-serif italic text-white/30 text-sm">&</span>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm">
                                S
                            </div>
                        </div>

                        <span className="font-mono text-[9px] tracking-widest uppercase text-white/20">
                            Bangalore 2026 • Designed with Love
                        </span>

                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="font-sans text-[9px] tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors"
                        >
                            Back to Top
                        </button>
                    </div>
                </div>

                <style>{`
              @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
              }
              .animate-marquee {
                  animation: marquee 40s linear infinite;
              }
          `}</style>
            </footer>

        </main>
    );
}
