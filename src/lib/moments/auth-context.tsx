import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  guestName: string;
}

interface AuthContextValue extends AuthState {
  // Phone: instant login (no OTP) via server-side Supabase user creation
  phoneLogin: (phone: string, guestName: string) => Promise<{ error?: string }>;
  // Email: OTP via Supabase
  sendEmailOtp: (email: string) => Promise<{ error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error?: string }>;
  setGuestName: (name: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function MomentsAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    guestName: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        guestName: session?.user?.user_metadata?.guest_name
          || session?.user?.user_metadata?.full_name
          || session?.user?.user_metadata?.name
          || '',
      }));
    }).catch(() => {
      setState(prev => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        guestName: session?.user?.user_metadata?.guest_name
          || session?.user?.user_metadata?.full_name
          || session?.user?.user_metadata?.name
          || prev.guestName,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Phone: instant login (no OTP needed) ──
  const phoneLogin = useCallback(async (phone: string, guestName: string): Promise<{ error?: string }> => {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;

      const response = await fetch('/api/moments/firebase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, guestName }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Failed to authenticate' };
      }

      // Establish Supabase session via magic link token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.hashedToken,
        type: 'magiclink',
      });

      if (verifyError) {
        return { error: verifyError.message };
      }

      // Set guest name in user metadata
      await supabase.auth.updateUser({ data: { guest_name: guestName, phone_number: fullPhone } });

      return {};
    } catch (err: any) {
      return { error: err.message || 'Authentication failed' };
    }
  }, []);

  // ── Email OTP ──
  const sendEmailOtp = useCallback(async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { error: error.message };
    return {};
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { error: error.message };
    return {};
  }, []);

  const setGuestName = useCallback(async (name: string) => {
    setState(prev => ({ ...prev, guestName: name }));
    await supabase.auth.updateUser({ data: { guest_name: name } });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, loading: false, guestName: '' });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      phoneLogin,
      sendEmailOtp, verifyEmailOtp,
      setGuestName, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useMomentsAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMomentsAuth must be used within MomentsAuthProvider');
  return ctx;
}
