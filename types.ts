import React from 'react';

export interface EventDetails {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  location: string;
  theme: 'earth' | 'water' | 'ether' | 'fire' | 'evening' | 'sacred';
  colorHex: string;
  palette?: string[];
  mapsLink?: string;
  icon?: React.ReactNode;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string; // Or transcript, or picture caption (max 50 chars for pictures)
  timestamp: string;
  type: 'text' | 'audio' | 'picture';
  audio_url?: string | null;
  image_url?: string | null; // For picture notes
  duration?: string; // e.g., "0:12" for audio
  x: number; // Percentage 0-100 or px
  y: number; // Percentage 0-100 or px
  rotation: number;
  variant: 'cream' | 'mist' | 'white' | 'raw';
  client_id?: string; // Session/client identifier
}

export interface RSVPData {
  name: string;
  email?: string;
  phone: string;
  attending: boolean;
  guests: number;
  attending_sangeet: boolean;
  attending_reception: boolean;
  attending_muhurtha: boolean;
  side?: 'bride' | 'groom';
  ecoConsent?: boolean;
  submittedAt?: string;
}

export enum AppTheme {
  DARK = 'dark',
  EARTH = 'earth',
  COBALT = 'cobalt',
  DIAMOND = 'diamond'
}