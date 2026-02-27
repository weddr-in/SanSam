import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../src/tiles-gallery.css';

// Base URL for Supabase storage
const BASE = 'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/';

// All 30 images from SanSam-pics — properly encoded
const ALL_IMAGES = [
    'WhatsApp Image 2026-02-09 at 3.09.50 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.10.13 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.05 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.05 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.07 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.14 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.15 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.15 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.17 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.21 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.21 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.22 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.32 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.33 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.33 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.34 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.34 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.35 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.35 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.36 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.37 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.37 PM (2).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.37 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.38 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.39 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.39 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.40 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.40 PM.jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.41 PM (1).jpeg',
    'WhatsApp Image 2026-02-09 at 3.11.41 PM.jpeg',
];

// Generate full URLs with proper encoding
const IMAGES = ALL_IMAGES.map(name => BASE + encodeURIComponent(name));

// Distribute images across 5 rows
function getRowImages(rowIndex: number): string[] {
    const perRow = Math.ceil(IMAGES.length / 5);
    const start = rowIndex * perRow;
    const slice = IMAGES.slice(start, start + perRow);
    // If a row is short, wrap around
    while (slice.length < perRow) {
        slice.push(IMAGES[slice.length % IMAGES.length]);
    }
    return slice;
}

// Row config: direction and speed per row
const ROW_CONFIG = [
    { direction: 'left' as const, speed: 1 },
    { direction: 'right' as const, speed: 2 },
    { direction: 'left' as const, speed: 3 },
    { direction: 'right' as const, speed: 4 },
    { direction: 'left' as const, speed: 1 },
];

export const TileScrollGallery: React.FC = () => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const touchStartX = useRef(0);

    // Open lightbox at a specific image
    const openLightbox = useCallback((globalIndex: number) => {
        setLightboxIndex(globalIndex);
        setLightboxOpen(true);
        document.body.style.overflow = 'hidden';
    }, []);

    // Close lightbox
    const closeLightbox = useCallback(() => {
        setLightboxOpen(false);
        document.body.style.overflow = '';
    }, []);

    // Navigate prev/next
    const goPrev = useCallback(() => {
        setLightboxIndex(prev => (prev - 1 + IMAGES.length) % IMAGES.length);
    }, []);

    const goNext = useCallback(() => {
        setLightboxIndex(prev => (prev + 1) % IMAGES.length);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxOpen, closeLightbox, goPrev, goNext]);

    // Touch swipe support for lightbox
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        const delta = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) {
            if (delta > 0) goNext();
            else goPrev();
        }
    };

    return (
        <section className="visual-archive-section" id="gallery-tiles">
            {/* Header — cleanly above the gallery, no overlap */}
            <div className="visual-archive-header">
                <span className="visual-archive-label">Visual Archive</span>
                <h2 className="visual-archive-title">Captured Moments</h2>
            </div>

            {/* Marquee Gallery Rows */}
            <div className="marquee-gallery">
                {ROW_CONFIG.map((config, rowIdx) => {
                    const rowImages = getRowImages(rowIdx);
                    return (
                        <div className="marquee-row" key={rowIdx}>
                            <div
                                className={`marquee-track marquee-track--${config.direction} marquee-track--speed-${config.speed}`}
                            >
                                {/* Duplicate the set for seamless infinite loop */}
                                {[...rowImages, ...rowImages].map((src, imgIdx) => {
                                    // Compute the global index for lightbox
                                    const globalIdx = (rowIdx * Math.ceil(IMAGES.length / 5) + (imgIdx % rowImages.length)) % IMAGES.length;
                                    return (
                                        <div
                                            key={imgIdx}
                                            className="marquee-tile"
                                            onClick={() => openLightbox(globalIdx)}
                                        >
                                            <img
                                                src={src}
                                                alt={`Memory ${globalIdx + 1}`}
                                                loading="lazy"
                                                draggable={false}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lightbox Modal */}
            <div
                className={`lightbox-overlay ${lightboxOpen ? 'active' : ''}`}
                onClick={closeLightbox}
            >
                {lightboxOpen && (
                    <>
                        <button
                            className="lightbox-close"
                            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
                            aria-label="Close gallery"
                        >
                            ✕
                        </button>

                        <button
                            className="lightbox-nav lightbox-nav--prev"
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            aria-label="Previous image"
                        >
                            ‹
                        </button>

                        <div
                            className="lightbox-image-wrapper"
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                        >
                            <img
                                key={lightboxIndex}
                                className="lightbox-image"
                                src={IMAGES[lightboxIndex]}
                                alt={`Photo ${lightboxIndex + 1} of ${IMAGES.length}`}
                                draggable={false}
                            />
                        </div>

                        <button
                            className="lightbox-nav lightbox-nav--next"
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            aria-label="Next image"
                        >
                            ›
                        </button>

                        <div className="lightbox-counter">
                            {lightboxIndex + 1} / {IMAGES.length}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};
