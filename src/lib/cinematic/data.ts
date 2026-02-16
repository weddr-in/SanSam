import type { Perspective } from './types';

export const images = [
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.09.50%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.10.13%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.05%20PM%20(1).jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.05%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.07%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.21%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.33%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.35%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.37%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.15%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.14%20PM.jpeg',
    'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/WhatsApp%20Image%202026-02-09%20at%203.11.33%20PM%20(1).jpeg',
];

// Wedding-themed perspectives shown at different scroll positions
export const perspectives: Perspective[] = [
    {
        title: 'The Wedding Of',
        description: 'Sanjana & Samartha',
        position: 'center',
    },
    {
        title: 'ॐ',
        description: '25 . 03 . 2026',
        position: 'center',
    },
    {
        title: 'आत्मनः प्रियम् भवति।',
        description: 'आत्मनः प्रियम् भवति॥',
        position: 'center',
    },
    {
        title: 'Save the Date',
        description: 'Bangalore, India',
        position: 'bottom',
    },
];

export const cylinderConfig = {
    radius: typeof window !== 'undefined' && window.innerWidth > 768 ? 2.8 : 2.4,
    height: typeof window !== 'undefined' && window.innerWidth > 768 ? 3.5 : 2.2,
    radialSegments: 64,
    heightSegments: 1,
};

export const particleConfig = {
    numParticles: 12,
    particleRadius: 3.3, // cylinderRadius + 0.8
    segments: 20,
    angleSpan: 0.3,
};

export const imageConfig = {
    width: 1024,
    height: 1024,
};
