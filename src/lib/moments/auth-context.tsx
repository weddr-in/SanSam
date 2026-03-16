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
  sendOtp: (phone: string) => Promise<{ error?: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error?: string }>;
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

  const sendOtp = useCallback(async (phone: string): Promise<{ error?: string }> => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) return { error: error.message };
    return {};
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string): Promise<{ error?: string }> => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' });
    if (error) return { error: error.message };
    return {};
  }, []);

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
    <AuthContext.Provider value={{ ...state, sendOtp, verifyOtp, sendEmailOtp, verifyEmailOtp, setGuestName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useMomentsAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMomentsAuth must be used within MomentsAuthProvider');
  return ctx;
}
