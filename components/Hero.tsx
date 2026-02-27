import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import Player from '@vimeo/player';

interface HeroProps {
  isMuted: boolean;
  toggleMute: () => void;
  onVideoReady: () => void;
}

export const Hero: React.FC<HeroProps> = ({ isMuted, toggleMute, onVideoReady }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoLoadedRef = useRef(false);
  const fallbackImageRef = useRef<HTMLImageElement>(null);

  // Synchronously compute isMobile for first render to avoid preloader flicker
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    // the window event is enough for resize since initial state covers mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Vimeo Configuration - with quality=auto for adaptive streaming
  const VIDEO_ID = isMobile ? 1168773407 : 1165111013;
  const VIDEO_SRC = `https://player.vimeo.com/video/${VIDEO_ID}?h=b39cd6900f&badge=0&autopause=0&player_id=hero_video&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&playsinline=1&quality=auto`;

  // Optimized local fallback image - loads instantly, no network dependency
  const FALLBACK_IMAGE = "/assets/hero_fallback.jpg";

  // Initialize Vimeo Player - VIDEO IS TOP PRIORITY
  useEffect(() => {
    if (!iframeRef.current) return;

    const player = new Player(iframeRef.current);
    playerRef.current = player;

    // Fallback timer - 10 seconds (optimized for mobile network)
    // Preloader stays visible until video actually plays OR timeout occurs
    const fallbackTimer = setTimeout(() => {
      if (!videoLoadedRef.current) {
        console.warn('Vimeo video failed to load after 10s, showing fallback image');
        setVideoFailed(true);
        onVideoReady(); // Clear preloader only on failure
      }
    }, 10000);

    // Event: Video started playing - success! Clear preloader
    player.on('play', () => {
      console.log('Vimeo video playing');
      videoLoadedRef.current = true;
      clearTimeout(fallbackTimer);
      setVideoFailed(false);
      onVideoReady(); // Clear preloader when video starts
    });

    // Event: Video loaded - try to play
    player.on('loaded', () => {
      console.log('Vimeo video loaded, attempting to play');
      player.ready().then(() => {
        player.setVolume(0);
        player.setMuted(true);
        player.play().catch((error) => {
          console.warn('Vimeo autoplay blocked:', error);
          // If autoplay is blocked, still clear preloader and show video (user can tap to play)
          videoLoadedRef.current = true;
          clearTimeout(fallbackTimer);
          onVideoReady();
        });
      });
    });

    // Event: Buffer ended (video is ready to play smoothly)
    player.on('bufferend', () => {
      console.log('Vimeo buffer ended, video ready');
      videoLoadedRef.current = true;
      clearTimeout(fallbackTimer);
      setVideoFailed(false);
    });

    // Event: Error - show fallback
    player.on('error', (error) => {
      console.error('Vimeo video error:', error);
      clearTimeout(fallbackTimer);
      setVideoFailed(true);
      onVideoReady();
    });

    // Initial Configuration
    player.ready().then(() => {
      player.setLoop(true);
      player.setVolume(0);
      player.setMuted(true);
    });

    return () => {
      clearTimeout(fallbackTimer);
      if (playerRef.current) playerRef.current.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Sync Mute State with Vimeo Player
  useEffect(() => {
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.setVolume(0);
      playerRef.current.setMuted(true);
    } else {
      playerRef.current.setVolume(1);
      playerRef.current.setMuted(false);
    }
  }, [isMuted]);

  return (
    <section id="film" className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden bg-black">

      {/* Hidden preload image - loads in background for instant display if video fails */}
      <img
        ref={fallbackImageRef}
        src={FALLBACK_IMAGE}
        alt=""
        loading="eager"
        fetchPriority="low"
        className="hidden"
        onLoad={() => console.log('Fallback image preloaded and cached')}
      />

      {/* Video Background - TOP PRIORITY */}
      <div className="absolute inset-0 z-0 pointer-events-none">

        {/* Fallback Image - Only shows when video completely fails */}
        {videoFailed && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${FALLBACK_IMAGE})` }}
          />
        )}

        {/* Vimeo Video Layer - Always loads first */}
        <div className={`relative w-full h-full overflow-hidden ${videoFailed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
          <iframe
            key={isMobile ? 'mobile' : 'desktop'}
            ref={iframeRef}
            src={VIDEO_SRC + '&background=1'}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; gyroscope; accelerometer"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 'max(100vw, 177.77vh)',
              height: 'max(100vh, 56.25vw)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              objectFit: 'cover',
            }}
            title="Sanjana & Samartha Engagement Video"
          />
        </div>
        <div className="absolute inset-0 bg-black/20 z-[1]" />
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-[2]" />
      </div>

      {/* 3. Main Content Layer */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col justify-between py-12 px-6 md:px-12 text-white"
      >
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-display text-xl md:text-2xl lg:text-3xl tracking-widest text-white/90">25.03.26</span>
            <span className="font-sans text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.4em] uppercase text-white/50 mt-1">Save the Date</span>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="font-sans text-[10px] tracking-[0.4em] uppercase text-white/50">Location</span>
            <span className="font-display text-xl tracking-wider text-white/90 mt-1">Bangalore, India</span>
          </div>
        </div>

        {/* Center Title - Liquid Chrome Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
          <div className="relative flex flex-col items-center">
            <motion.h2
              initial={{ opacity: 1, letterSpacing: '0.6em' }}
              animate={{ opacity: 1, letterSpacing: '0.6em' }}
              className="font-sans text-[10px] md:text-xs lg:text-sm tracking-[0.4em] md:tracking-[0.6em] uppercase text-white/60 mb-6 md:mb-8"
            >
              The Wedding Of
            </motion.h2>

            <div className="relative inline-flex flex-col items-center justify-center">
              {/* Sanjana */}
              <motion.h1
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[6rem] leading-[0.9] liquid-chrome drop-shadow-2xl z-20 tracking-wide"
              >
                Sanjana
              </motion.h1>

              {/* Ampersand */}
              <motion.span
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-serif italic text-2xl sm:text-3xl md:text-4xl text-white/80 font-light z-10 my-2 md:my-3"
              >
                &
              </motion.span>

              {/* Samartha */}
              <motion.h1
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[6rem] leading-[0.9] liquid-chrome drop-shadow-2xl z-20 tracking-wide"
              >
                Samartha
              </motion.h1>
            </div>

            {/* Aesthetic Countdown Timer */}
            <CountdownTimer targetDate="2026-03-25T00:00:00" />

          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-between items-end gap-2">
          {/* Desktop: Scroll to Explore */}
          <div className="hidden sm:flex flex-col gap-2">
            <div className="h-[1px] w-12 bg-white/30" />
            <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/50">Scroll to Explore</span>
          </div>

          {/* Mobile: Scroll to RSVP hint - Absolute Bottom Center */}
          <div className="sm:hidden absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-white/70">Scroll to RSVP</span>
            <div className="w-5 h-8 border-2 border-white/50 rounded-full flex items-start justify-center pt-1.5">
              <div className="w-1.5 h-2 bg-white/80 rounded-full animate-bounce" />
            </div>
          </div>

          {/* Prominent Audio Toggle */}
          <button
            onClick={toggleMute}
            className="group flex items-center gap-2 md:gap-3 pl-3 md:pl-6 pr-2 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] ml-auto"
          >
            <span className="hidden sm:inline text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase text-white/80 group-hover:text-white transition-colors whitespace-nowrap">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${!isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
              {isMuted ? <VolumeX size={14} className="md:w-4 md:h-4" /> : <Volume2 size={14} className="md:w-4 md:h-4 animate-pulse" />}
            </div>
          </button>
        </div>
      </motion.div>
    </section>
  );
};
