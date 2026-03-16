import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';

// Cinematic background images from the couple's photos
const BG_IMAGES = [
  'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.09.50%20PM.jpeg',
  'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.05%20PM%20(1).jpeg',
  'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.33%20PM.jpeg',
];

export function PhoneLogin() {
  const { sendOtp, verifyOtp, setGuestName, sendEmailOtp, verifyEmailOtp, user, guestName: existingName } = useMomentsAuth();
  const { setView } = useMomentsStore();

  const [step, setStep] = useState<'welcome' | 'phone' | 'otp' | 'email' | 'email-otp' | 'name'>('welcome');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Returning user shortcut
  useEffect(() => {
    if (user && existingName) setView('events');
  }, [user, existingName]);

  // Slow crossfade background
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % BG_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // OTP countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length > 5) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    return digits;
  };

  const canSendOtp = name.trim().length >= 2 && phone.replace(/\D/g, '').length === 10;

  const handleSendOtp = async () => {
    if (!canSendOtp) return;
    setLoading(true);
    setError('');
    const result = await sendOtp(phone.replace(/\D/g, ''));
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setAuthMethod('phone');
      setStep('otp');
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d) && value) {
      if (authMethod === 'email') handleVerifyEmailOtp(newOtp.join(''));
      else handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      if (authMethod === 'email') handleVerifyEmailOtp(pasted);
      else handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (token?: string) => {
    const code = token || otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const result = await verifyOtp(phone.replace(/\D/g, ''), code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      await setGuestName(name.trim());
      setView('events');
    }
  };

  const canSendEmailOtp = name.trim().length >= 2 && email.trim().length > 3 && email.includes('@');

  const handleSendEmailOtp = async () => {
    if (!canSendEmailOtp) return;
    setLoading(true);
    setError('');
    const result = await sendEmailOtp(email.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setAuthMethod('email');
      setStep('email-otp');
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  };

  const handleVerifyEmailOtp = async (token?: string) => {
    const code = token || otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const result = await verifyEmailOtp(email.trim(), code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      await setGuestName(name.trim());
      setView('events');
    }
  };

  const handleNameSubmit = async () => {
    if (name.trim().length < 2) {
      setError('Please enter your name');
      return;
    }
    await setGuestName(name.trim());
    setView('events');
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Cinematic crossfading background */}
      {BG_IMAGES.map((src, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === bgIndex ? 1 : 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover scale-105"
            style={{ filter: 'brightness(0.25) saturate(0.6)' }}
          />
        </motion.div>
      ))}

      {/* Film grain overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Branding */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <p className="text-4xl text-[#d4af37]/50 tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: 'italic' }}>S <span className="text-[#d4af37]/25 text-2xl">&</span> S</p>
        </motion.div>

        {/* Main content area */}
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">

            {/* ─── WELCOME SCREEN ─── */}
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Title */}
                <motion.h1
                  className="font-serif text-5xl md:text-6xl text-[#f5f0e8] font-light leading-[1.1] mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  Moments
                </motion.h1>
                <motion.p
                  className="font-sans text-[13px] text-white/35 mb-10 leading-relaxed max-w-[280px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Capture & relive the magic of our celebration together
                </motion.p>

                {/* Login options */}
                <div className="space-y-3">
                  {/* Phone */}
                  <motion.button
                    onClick={() => setStep('phone')}
                    className="w-full flex items-center gap-4 px-5 py-4
                      bg-white/[0.07] backdrop-blur-md border border-white/[0.08]
                      hover:bg-white/[0.12] hover:border-white/[0.15]
                      active:scale-[0.98] transition-all duration-300"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span className="font-sans text-[13px] text-white/70 tracking-wide">Continue with Phone</span>
                  </motion.button>

                  {/* Email */}
                  <motion.button
                    onClick={() => setStep('email')}
                    className="w-full flex items-center gap-4 px-5 py-4
                      bg-white/[0.07] backdrop-blur-md border border-white/[0.08]
                      hover:bg-white/[0.12] hover:border-white/[0.15]
                      active:scale-[0.98] transition-all duration-300"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <span className="font-sans text-[13px] text-white/70 tracking-wide">Continue with Email</span>
                  </motion.button>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mt-4 text-center">{error}</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ─── PHONE + NAME SCREEN ─── */}
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button onClick={() => { setStep('welcome'); setError(''); }}
                  className="font-sans text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors mb-6 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                  Back
                </button>

                <h2 className="font-serif text-3xl text-[#f5f0e8] font-light mb-1">Enter your details</h2>
                <p className="font-sans text-[12px] text-white/25 mb-8">We'll send you a verification code</p>

                <div className="space-y-5">
                  {/* Name */}
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      placeholder="Your name"
                      autoFocus
                      className="w-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                        px-5 py-4 text-[#f5f0e8] font-serif text-base
                        placeholder:text-white/20
                        focus:outline-none focus:border-[#d4af37]/30 focus:bg-white/[0.08]
                        transition-all duration-500"
                      disabled={loading}
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-sans text-[13px] text-[#d4af37]/50 select-none">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && canSendOtp && handleSendOtp()}
                      placeholder="99999 99999"
                      className="w-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                        pl-14 pr-5 py-4 text-[#f5f0e8] font-sans text-base tracking-wider
                        placeholder:text-white/20
                        focus:outline-none focus:border-[#d4af37]/30 focus:bg-white/[0.08]
                        transition-all duration-500"
                      maxLength={11}
                      disabled={loading}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mt-3">{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleSendOtp}
                  disabled={loading || !canSendOtp}
                  className="w-full mt-6 py-4 bg-[#d4af37]/15 border border-[#d4af37]/25
                    backdrop-blur-md font-sans text-[12px] tracking-[0.3em] uppercase text-[#d4af37]
                    disabled:opacity-25 disabled:cursor-not-allowed
                    hover:bg-[#d4af37]/25 hover:border-[#d4af37]/40
                    active:scale-[0.98] transition-all duration-300"
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Spinner /> : 'Send Code'}
                </motion.button>
              </motion.div>
            )}

            {/* ─── OTP SCREEN ─── */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="font-sans text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors mb-6 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                  Back
                </button>

                <h2 className="font-serif text-3xl text-[#f5f0e8] font-light mb-1">Verification</h2>
                <p className="font-sans text-[12px] text-white/25 mb-8">
                  Code sent to <span className="text-[#d4af37]/50">+91 {phone}</span>
                </p>

                {/* OTP boxes */}
                <div className="flex gap-2.5 mb-4" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-full aspect-square max-w-[56px] text-center text-xl font-sans
                        backdrop-blur-md border transition-all duration-300
                        ${digit
                          ? 'bg-[#d4af37]/[0.08] border-[#d4af37]/30 text-[#f5f0e8]'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/60'}
                        focus:outline-none focus:border-[#d4af37]/50 focus:bg-[#d4af37]/[0.06]`}
                      maxLength={1}
                      disabled={loading}
                    />
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mb-3">{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otp.some(d => !d)}
                  className="w-full py-4 bg-[#d4af37]/15 border border-[#d4af37]/25
                    backdrop-blur-md font-sans text-[12px] tracking-[0.3em] uppercase text-[#d4af37]
                    disabled:opacity-25 disabled:cursor-not-allowed
                    hover:bg-[#d4af37]/25 active:scale-[0.98] transition-all duration-300"
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Spinner /> : 'Verify & Enter'}
                </motion.button>

                <div className="text-center mt-5">
                  {countdown > 0 ? (
                    <p className="font-sans text-[10px] text-white/15">
                      Resend in <span className="text-[#d4af37]/30 tabular-nums">{countdown}s</span>
                    </p>
                  ) : (
                    <button onClick={() => { handleSendOtp(); setOtp(['', '', '', '', '', '']); }}
                      className="font-sans text-[10px] tracking-wider uppercase text-[#d4af37]/30 hover:text-[#d4af37]/60 transition-colors">
                      Resend Code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── EMAIL + NAME SCREEN ─── */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button onClick={() => { setStep('welcome'); setError(''); }}
                  className="font-sans text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors mb-6 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                  Back
                </button>

                <h2 className="font-serif text-3xl text-[#f5f0e8] font-light mb-1">Enter your details</h2>
                <p className="font-sans text-[12px] text-white/25 mb-8">We'll send a verification code to your email</p>

                <div className="space-y-5">
                  {/* Name */}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder="Your name"
                    autoFocus
                    className="w-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                      px-5 py-4 text-[#f5f0e8] font-serif text-base
                      placeholder:text-white/20
                      focus:outline-none focus:border-[#d4af37]/30 focus:bg-white/[0.08]
                      transition-all duration-500"
                    disabled={loading}
                  />
                  {/* Email */}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && canSendEmailOtp && handleSendEmailOtp()}
                    placeholder="your@email.com"
                    className="w-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                      px-5 py-4 text-[#f5f0e8] font-sans text-[14px]
                      placeholder:text-white/20
                      focus:outline-none focus:border-[#d4af37]/30 focus:bg-white/[0.08]
                      transition-all duration-500"
                    disabled={loading}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mt-3">{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleSendEmailOtp}
                  disabled={loading || !canSendEmailOtp}
                  className="w-full mt-6 py-4 bg-[#d4af37]/15 border border-[#d4af37]/25
                    backdrop-blur-md font-sans text-[12px] tracking-[0.3em] uppercase text-[#d4af37]
                    disabled:opacity-25 disabled:cursor-not-allowed
                    hover:bg-[#d4af37]/25 active:scale-[0.98] transition-all duration-300"
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Spinner /> : 'Send Code'}
                </motion.button>
              </motion.div>
            )}

            {/* ─── EMAIL OTP SCREEN ─── */}
            {step === 'email-otp' && (
              <motion.div
                key="email-otp"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="font-sans text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors mb-6 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                  Back
                </button>

                <h2 className="font-serif text-3xl text-[#f5f0e8] font-light mb-1">Verification</h2>
                <p className="font-sans text-[12px] text-white/25 mb-8">
                  Code sent to <span className="text-[#d4af37]/50">{email}</span>
                </p>

                {/* OTP boxes */}
                <div className="flex gap-2.5 mb-4" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-full aspect-square max-w-[56px] text-center text-xl font-sans
                        backdrop-blur-md border transition-all duration-300
                        ${digit
                          ? 'bg-[#d4af37]/[0.08] border-[#d4af37]/30 text-[#f5f0e8]'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/60'}
                        focus:outline-none focus:border-[#d4af37]/50 focus:bg-[#d4af37]/[0.06]`}
                      maxLength={1}
                      disabled={loading}
                    />
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mb-3">{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={() => handleVerifyEmailOtp()}
                  disabled={loading || otp.some(d => !d)}
                  className="w-full py-4 bg-[#d4af37]/15 border border-[#d4af37]/25
                    backdrop-blur-md font-sans text-[12px] tracking-[0.3em] uppercase text-[#d4af37]
                    disabled:opacity-25 disabled:cursor-not-allowed
                    hover:bg-[#d4af37]/25 active:scale-[0.98] transition-all duration-300"
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <Spinner /> : 'Verify & Enter'}
                </motion.button>

                <div className="text-center mt-5">
                  {countdown > 0 ? (
                    <p className="font-sans text-[10px] text-white/15">
                      Resend in <span className="text-[#d4af37]/30 tabular-nums">{countdown}s</span>
                    </p>
                  ) : (
                    <button onClick={() => { handleSendEmailOtp(); setOtp(['', '', '', '', '', '']); }}
                      className="font-sans text-[10px] tracking-wider uppercase text-[#d4af37]/30 hover:text-[#d4af37]/60 transition-colors">
                      Resend Code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── NAME SCREEN (for email/google users) ─── */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-serif text-3xl text-[#f5f0e8] font-light mb-1">Almost there</h2>
                <p className="font-sans text-[12px] text-white/25 mb-8">What should we call you?</p>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="Your name"
                  autoFocus
                  className="w-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                    px-5 py-4 text-[#f5f0e8] font-serif text-lg
                    placeholder:text-white/20
                    focus:outline-none focus:border-[#d4af37]/30 focus:bg-white/[0.08]
                    transition-all duration-500"
                />

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs font-sans mt-3">{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleNameSubmit}
                  disabled={name.trim().length < 2}
                  className="w-full mt-6 py-4 bg-[#d4af37]/15 border border-[#d4af37]/25
                    backdrop-blur-md font-sans text-[12px] tracking-[0.3em] uppercase text-[#d4af37]
                    disabled:opacity-25 disabled:cursor-not-allowed
                    hover:bg-[#d4af37]/25 active:scale-[0.98] transition-all duration-300"
                  whileTap={{ scale: 0.98 }}
                >
                  Enter Moments
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-3.5 h-3.5 border border-[#d4af37]/40 border-t-[#d4af37] rounded-full animate-spin" />
    </span>
  );
}
