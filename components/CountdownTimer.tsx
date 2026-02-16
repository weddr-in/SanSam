import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: string;
}

export const CountdownTimer = React.memo<CountdownTimerProps>(({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 1 }}
      className="mt-12 md:mt-16 flex items-center gap-6 md:gap-12"
    >
      {/* Days */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-2xl md:text-3xl text-white/90 tracking-widest tabular-nums drop-shadow-lg">
          {String(timeLeft.days).padStart(3, '0')}
        </span>
        <span className="font-sans text-[8px] tracking-[0.3em] uppercase text-white/70">Days</span>
      </div>

      <div className="h-8 w-[1px] bg-white/10" />

      {/* Hours */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-2xl md:text-3xl text-white/90 tracking-widest tabular-nums drop-shadow-lg">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="font-sans text-[8px] tracking-[0.3em] uppercase text-white/70">Hours</span>
      </div>

      <div className="h-8 w-[1px] bg-white/10" />

      {/* Minutes */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-2xl md:text-3xl text-white/90 tracking-widest tabular-nums drop-shadow-lg">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="font-sans text-[8px] tracking-[0.3em] uppercase text-white/70">Mins</span>
      </div>

      <div className="h-8 w-[1px] bg-white/10" />

      {/* Seconds */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-2xl md:text-3xl text-white/90 tracking-widest tabular-nums drop-shadow-lg">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="font-sans text-[8px] tracking-[0.3em] uppercase text-white/70">Secs</span>
      </div>
    </motion.div>
  );
});

CountdownTimer.displayName = 'CountdownTimer';
