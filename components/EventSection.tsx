import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventDetails } from '../types';
import { MapPin, Clock, Calendar, Palette, ArrowRight, ExternalLink, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Shirt } from 'lucide-react';
import { GrowingVine } from './GrowingVine';

interface EventSectionProps {
    event: EventDetails;
    index: number;
}

// --- Curated Image Sets (Expanded) ---
const getThemeImages = (theme: string) => {
    switch (theme) {
        case 'earth': // Stambha
            return [
                'https://images.unsplash.com/photo-1605494165683-1b91316428ca?q=80&w=800',
                'https://images.unsplash.com/photo-1606216832963-7eec122e1694?q=80&w=800',
                'https://images.unsplash.com/photo-1583934555972-94f97cd21310?q=80&w=800',
                'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200',
                'https://images.unsplash.com/photo-1519225421980-715cb0202128?q=80&w=1200',
                'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?q=80&w=800',
            ];
        case 'water': // Reception
        case 'evening': // Reception (New)
            return [
                'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/2.png', // Main - Reception Theme
                'https://i.pinimg.com/736x/50/98/d5/5098d572253026ca72aa9b9068fc5375.jpg',
                'https://i.pinimg.com/736x/1f/c0/f7/1fc0f7d2b625675f15ef7f3e3d85792d.jpg',
                'https://i.pinimg.com/1200x/44/be/e0/44bee017474534afe3c77cba6b2053bc.jpg',
                'https://i.pinimg.com/1200x/da/64/04/da6404c2a6e1fceb5fd77d53965a202d.jpg',
                'https://i.pinimg.com/736x/6a/dd/3a/6add3ac6aa0e227f3f4f0f63a16e8ee2.jpg',
            ];
        case 'fire': // Sangeet
            return [
                'https://i.pinimg.com/736x/da/30/70/da30705a938baf0a28c62ff565d1f858.jpg', // Main (was index 4)
                'https://i.pinimg.com/736x/91/e0/c3/91e0c325ffc7a06ab369582697971063.jpg',
                'https://i.pinimg.com/736x/24/69/ad/2469ad019753d3ed0343366df9fbd80f.jpg',
                'https://i.pinimg.com/736x/0b/73/92/0b7392191a2e2c4f1d9a75385c50c61c.jpg',
                'https://i.pinimg.com/736x/0a/3f/79/0a3f79a2dab7347a63a1052caa7dc244.jpg', // Was Main
                'https://i.pinimg.com/736x/44/be/e0/44bee017474534afe3c77cba6b2053bc.jpg',
            ];
        case 'ether': // Muhurtha
        case 'sacred': // Wedding (New)
            return [
                'https://i.pinimg.com/736x/68/00/6c/68006cebf5583930ccb5d77dd3489202.jpg', // Main Centre
                'https://i.pinimg.com/736x/7b/0c/c5/7b0cc5f4c02f7e70c02891e8fa0cc047.jpg',
                'https://i.pinimg.com/1200x/fb/6d/12/fb6d1250a871c026e8c006e15f98425b.jpg', // Left Big One
                'https://i.pinimg.com/1200x/86/b4/d4/86b4d4a02e5946c502280613f92665d6.jpg',
                'https://i.pinimg.com/1200x/97/d6/30/97d630e77b08274e21de9024825785d0.jpg',
                'https://i.pinimg.com/1200x/3f/ff/5d/3fff5d65556d729dd192462d0a27e5dd.jpg',
            ];
        default:
            return [];
    }
};

const getThemeGradient = (theme: string) => {
    switch (theme) {
        case 'earth': return 'from-amber-900/40 via-orange-900/20 to-black';
        case 'fire': return 'from-red-900/40 via-orange-900/20 to-black';
        case 'water':
        case 'evening': return 'from-blue-900/40 via-cyan-900/20 to-black';
        case 'ether':
        case 'sacred': return 'from-purple-900/40 via-indigo-900/20 to-black';
        default: return 'from-gray-900/40 via-gray-900/20 to-black';
    }
};

const getThemeAccent = (theme: string) => {
    switch (theme) {
        case 'earth': return 'text-amber-200';
        case 'fire': return 'text-orange-200';
        case 'water':
        case 'evening': return 'text-cyan-200';
        case 'ether':
        case 'sacred': return 'text-purple-200';
        default: return 'text-white';
    }
};

export const EventSection: React.FC<EventSectionProps> = ({ event, index }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [expandedPalette, setExpandedPalette] = useState(false);
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
    const [showDesktopGallery, setShowDesktopGallery] = useState(false);
    const [desktopGalleryIndex, setDesktopGalleryIndex] = useState(0);
    const [imageZoom, setImageZoom] = useState(1);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const images = getThemeImages(event.theme).slice(0, 6);
    const isEven = index % 2 === 0;

    // Parse event date and time properly
    const getEventDateTime = () => {
        // Date format is DD.MM.YY, convert to proper date
        const dateParts = event.date.split('.');
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const year = 2000 + parseInt(dateParts[2]); // 26 -> 2026

        // Parse time (e.g., "6:30 PM Onwards" -> 18:30)
        const timeMatch = event.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
        let hours = 0;
        let minutes = 0;
        if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const isPM = timeMatch[3].toUpperCase() === 'PM';
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
        }

        // Create start date (IST timezone)
        const startDate = new Date(year, month - 1, day, hours, minutes);
        // End date is 4 hours later
        const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

        return { startDate, endDate };
    };

    const { startDate, endDate } = getEventDateTime();

    // Format for Google Calendar (YYYYMMDDTHHmmss)
    const formatForGoogle = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    // Format for Apple Calendar ICS (YYYYMMDDTHHMMSS)
    const formatForICS = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    // Detect device type and browser
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
    const isChromeIOS = typeof window !== 'undefined' && isIOS && /CriOS/.test(navigator.userAgent);
    const isSafariIOS = typeof window !== 'undefined' && isIOS && !isChromeIOS;

    // Event details
    const eventTitle = `${event.title} - Sanjana & Samartha Wedding`;
    const eventDescription = `${event.subtitle}\n\nDress Code: ${event.theme === 'fire' ? 'Warm earthy tones - Black, Taupe, Camel' : event.theme === 'water' ? 'Elegant blues - Cobalt, Navy, Silver' : 'Traditional - White, Gold, Cream'}\n\nVisit: sanjanaandsamartha.weddr.in`;
    const eventLocation = event.location;

    // Google Calendar URL (fallback for desktop and non-Safari iOS browsers)
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}&ctz=Asia/Kolkata`;

    // Generate ICS file content for iOS
    const generateICS = () => {
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Sanjana & Samartha Wedding//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${event.title.replace(/\s+/g, '-')}-${Date.now()}@sanjanaandsamartha.com`,
            `DTSTART:${formatForICS(startDate)}`,
            `DTEND:${formatForICS(endDate)}`,
            `SUMMARY:${eventTitle}`,
            `DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}`,
            `LOCATION:${eventLocation}`,
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        return icsContent;
    };

    // Generate Android Intent URI for opening calendar app directly
    const getAndroidIntentUrl = () => {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();

        // Android Intent URI format to open calendar app
        return `intent://events#Intent;` +
            `action=android.intent.action.INSERT;` +
            `type=vnd.android.cursor.item/event;` +
            `S.title=${encodeURIComponent(eventTitle)};` +
            `S.description=${encodeURIComponent(eventDescription)};` +
            `S.eventLocation=${encodeURIComponent(eventLocation)};` +
            `l.beginTime=${startTime};` +
            `l.endTime=${endTime};` +
            `S.browser_fallback_url=${encodeURIComponent(googleCalendarUrl)};` +
            `end;`;
    };

    // Get the appropriate calendar URL based on device and browser
    const getCalendarUrl = () => {
        if (isAndroid) {
            // Android: Use Intent URI to open calendar app
            return getAndroidIntentUrl();
        } else if (isChromeIOS) {
            // Chrome on iOS: Use Google Calendar (Chrome can't open .ics in Calendar app)
            return googleCalendarUrl;
        } else if (!isIOS) {
            // Desktop: Use Google Calendar
            return googleCalendarUrl;
        }
        // Safari on iOS: Will be handled by click event (downloads .ics file)
        return '#';
    };

    const calendarUrl = getCalendarUrl();

    // Handle calendar click
    const handleCalendarClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isSafariIOS) {
            // Safari on iOS: Download .ics file
            e.preventDefault();

            // Create ICS file
            const icsContent = generateICS();
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

            // Create temporary URL
            const url = URL.createObjectURL(blob);

            // Create temporary link with proper .ics extension
            const link = document.createElement('a');
            link.href = url;
            link.download = `${event.title.replace(/\s+/g, '-')}.ics`;
            link.style.display = 'none';

            // Append, click, and cleanup
            document.body.appendChild(link);
            link.click();

            // Cleanup after a short delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        }
        // For Chrome iOS, Android, and Desktop, let the href handle it (Google Calendar or Intent)
    };

    // Google Maps Links
    // View on Map - Opens location on map
    const mapsUrl = event.mapsLink;

    // Directions - distinct link if needed, otherwise same as mapsLink
    const directionsUrl = event.mapsLink;

    // Long press handlers for image preview
    const handleTouchStart = (img: string) => {
        longPressTimer.current = setTimeout(() => {
            setPreviewImage(img);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    // Desktop Gallery Handlers
    const openDesktopGallery = (imageIndex: number = 0) => {
        setDesktopGalleryIndex(imageIndex);
        setShowDesktopGallery(true);
        setImageZoom(1);
        document.body.style.overflow = 'hidden';
        document.body.classList.add('gallery-open');
    };

    const closeDesktopGallery = () => {
        setShowDesktopGallery(false);
        setImageZoom(1);
        document.body.style.overflow = '';
        document.body.classList.remove('gallery-open');
    };

    const nextImage = () => {
        setDesktopGalleryIndex((prev) => (prev + 1) % images.length);
        setImageZoom(1);
    };

    const prevImage = () => {
        setDesktopGalleryIndex((prev) => (prev - 1 + images.length) % images.length);
        setImageZoom(1);
    };

    const zoomIn = () => {
        setImageZoom((prev) => Math.min(prev + 0.25, 3));
    };

    const zoomOut = () => {
        setImageZoom((prev) => Math.max(prev - 0.25, 1));
    };

    // Keyboard navigation for desktop gallery
    useEffect(() => {
        if (!showDesktopGallery) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDesktopGallery();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === '+' || e.key === '=') zoomIn();
            if (e.key === '-' || e.key === '_') zoomOut();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showDesktopGallery, images.length]);

    return (
        <>
            {/* MOBILE & TABLET: Elegant Magazine-Style Layout */}
            <section className="lg:hidden relative w-full min-h-screen bg-black py-16 px-5">
                {/* Hero Image - Only for Reception & Muhurtham (not Sangeet) */}
                {event.theme !== 'fire' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.05 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-8 shadow-2xl"
                        onTouchStart={() => handleTouchStart(images[0])}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={() => handleTouchStart(images[0])}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                    >
                        <motion.img
                            src={images[0]}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            animate={{
                                scale: [1, 1.05],
                                x: [0, -10],
                                y: [0, -10]
                            }}
                            transition={{
                                duration: 10,
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "easeInOut"
                            }}
                        />
                        {/* Subtle Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${getThemeGradient(event.theme)} opacity-40`} />
                    </motion.div>
                )}

                {/* Typography Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-8"
                >
                    {/* Theme Label */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <span className={`font-sans text-[10px] tracking-[0.3em] uppercase ${getThemeAccent(event.theme)}`}>
                            {event.theme}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-5xl text-white leading-[0.95] mb-3 text-center tracking-tight">
                        {event.title}
                    </h2>

                    {/* Subtitle */}
                    <p className="font-serif italic text-xl text-white/60 text-center mb-6">
                        {event.subtitle}
                    </p>
                </motion.div>

                {/* Details Card - Elegant & Refined with Theme Border */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 overflow-hidden"
                >
                    {/* Theme-colored top border */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ backgroundColor: event.colorHex }}
                    />
                    {/* Date & Time */}
                    <div className="mb-6 pb-6 border-b border-white/10">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="mt-1">
                                <Calendar size={16} className="text-white/40" />
                            </div>
                            <div className="flex-1">
                                <span className="block font-sans text-[10px] tracking-widest uppercase text-white/40 mb-2">
                                    Date & Time
                                </span>
                                <div className="font-display text-3xl text-white mb-1 leading-tight">
                                    {event.date}
                                </div>
                                <div className="font-serif italic text-lg text-white/60">
                                    {event.time}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mb-6">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <MapPin size={16} className="text-white/40" />
                            </div>
                            <div className="flex-1">
                                <span className="block font-sans text-[10px] tracking-widest uppercase text-white/40 mb-2">
                                    Venue
                                </span>
                                <div className="font-display text-2xl text-white mb-2 leading-tight">
                                    {event.location}
                                </div>
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                                >
                                    <span>View on Map</span>
                                    <ArrowRight size={12} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Attire / Dress Code */}
                    {event.outfit && (
                        <div className="mb-6 pb-6 border-b border-white/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <Shirt size={16} className="text-white/40" />
                                </div>
                                <div className="flex-1">
                                    <span className="block font-sans text-[10px] tracking-widest uppercase text-white/40 mb-2">
                                        Dress Code
                                    </span>
                                    <div className="font-display text-3xl text-white mb-2 leading-tight">
                                        {event.outfit.type}
                                    </div>
                                    <p className="font-sans text-sm text-white/60 leading-relaxed pr-4">
                                        {event.outfit.description} {event.outfit.colors}
                                        {event.outfit.avoid && (
                                            <span className="text-red-400/50 italic ml-2">
                                                (Avoid {event.outfit.avoid.toLowerCase().replace('please avoid ', '')})
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Color Palette - Expandable */}
                    {event.palette && (
                        <div className="pt-6 border-t border-white/10">
                            <button
                                onClick={() => setExpandedPalette(!expandedPalette)}
                                className="w-full flex items-center justify-between cursor-pointer group"
                            >
                                <span className="font-sans text-[10px] tracking-widest uppercase text-white/40 group-hover:text-white/60 transition-colors">
                                    Color Palette
                                </span>
                                <div className="flex gap-2">
                                    {event.palette.slice(0, 4).map((color, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg relative"
                                            style={{ backgroundColor: color }}
                                        >
                                            <AnimatePresence>
                                                {expandedPalette && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg px-2 py-1 whitespace-nowrap"
                                                    >
                                                        <span className="font-mono text-[9px] text-white">
                                                            {color}
                                                        </span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Action Buttons - Elegant */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="grid grid-cols-2 gap-3 mb-8"
                >
                    <a
                        href={googleCalendarUrl}
                        onClick={handleCalendarClick}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-3 py-5 bg-white text-black rounded-2xl font-sans text-xs font-semibold tracking-wider uppercase transition-transform active:scale-95"
                    >
                        <Calendar size={20} />
                        <span>Add to Calendar</span>
                    </a>
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-3 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-sans text-xs font-semibold tracking-wider uppercase transition-all active:scale-95 active:bg-white/20"
                    >
                        <ExternalLink size={20} />
                        <span>Directions</span>
                    </a>
                </motion.div>

                {/* Image Gallery - Swipeable with Elegant Label */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                    className="space-y-5"
                >
                    {/* Aesthetic Label */}
                    <div className="flex items-center gap-3">
                        <div className="h-[1px] w-8 bg-white/20" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                            Event Aesthetics
                        </span>
                        <div className="h-[1px] flex-1 bg-white/20" />
                    </div>

                    {/* Swipeable Gallery */}
                    <div className="relative">
                        {(() => {
                            // For Sangeet (fire): show all images. For others: skip first image (shown as hero)
                            const galleryImages = event.theme === 'fire' ? images : images.slice(1);
                            return (
                                <>
                                    <div
                                        className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                        onScroll={(e) => {
                                            const scrollLeft = e.currentTarget.scrollLeft;
                                            const itemWidth = e.currentTarget.scrollWidth / galleryImages.length;
                                            setCurrentGalleryIndex(Math.round(scrollLeft / itemWidth));
                                        }}
                                    >
                                        {galleryImages.map((img, i) => (
                                            <motion.div
                                                key={i}
                                                className="flex-shrink-0 w-[calc(100%-40px)] aspect-square rounded-xl overflow-hidden snap-center"
                                                whileTap={{ scale: 0.98 }}
                                                onTouchStart={() => handleTouchStart(img)}
                                                onTouchEnd={handleTouchEnd}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`${event.title} ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Pagination Dots */}
                                    <div className="flex justify-center gap-2 mt-4">
                                        {galleryImages.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentGalleryIndex
                                                    ? 'w-6 bg-white/80'
                                                    : 'w-1.5 bg-white/30'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </motion.div>

                {/* Full-Screen Image Preview Modal - Mobile Only */}
                <AnimatePresence>
                    {previewImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4"
                            onClick={() => setPreviewImage(null)}
                        >
                            <button
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"
                                onClick={() => setPreviewImage(null)}
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <motion.img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-lg"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.9 }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Custom Styles */}
                <style>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
            </section>

            {/* DESKTOP (Large screens only): Original Premium Layout */}
            <section className="hidden lg:block relative w-full py-32 border-b border-white/5 bg-[#050505] overflow-hidden">

                {/* Growing Vine Animation - Left Side */}
                <GrowingVine theme={event.theme === 'evening' ? 'water' : event.theme === 'sacred' ? 'ether' : event.theme as 'earth' | 'water' | 'fire' | 'ether'} />

                {/* Subtle grain texture only */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
                </div>

                <div className="container mx-auto px-6 md:px-12 relative z-10">

                    {/* Section Header (Only for First Event) */}
                    {index === 0 && (
                        <div className="text-center mb-24">
                            <span className="font-sans text-[10px] tracking-[0.6em] uppercase text-white/50 block mb-4">Itinerary</span>
                            <h2 className="font-display text-4xl md:text-5xl text-white/90">The Celebration</h2>
                            <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent mx-auto mt-6" />
                        </div>
                    )}

                    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 md:gap-24 items-center`}>

                        {/* Text Content - Dims on Focus */}
                        <motion.div
                            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            animate={{ opacity: isFocused ? 0.2 : 1, filter: isFocused ? 'blur(4px)' : 'blur(0px)' }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex-1 text-left transition-all duration-700"
                        >
                            {/* Index & Theme Tag */}
                            <div className="flex items-center gap-4 mb-6">
                                <span className="font-mono text-xs text-white/70">0{index + 1}</span>
                                <div className="h-[1px] w-12 bg-white/20" />
                                <span className={`font-sans text-xs tracking-[0.3em] uppercase ${getThemeAccent(event.theme)}`}>{event.theme}</span>
                            </div>

                            {/* Title */}
                            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-[0.9] mb-6 tracking-tight">
                                {event.title}
                            </h2>

                            <p className="font-serif italic text-2xl text-white/60 mb-10 font-light">
                                {event.subtitle}
                            </p>

                            {/* Details Card - Redesigned */}
                            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 p-8 md:p-12 rounded-[2rem] mb-12 hover:bg-white/10 transition-all duration-500 group overflow-hidden">
                                {/* Glossy sheen effect */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50" />

                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                                    {/* Date Section */}
                                    <div className="flex flex-col gap-3 group/date">
                                        <div className="flex items-center gap-3 text-white/40 mb-1">
                                            <Calendar size={14} className="text-white/30" />
                                            <span className="font-sans text-[10px] tracking-[0.25em] uppercase opacity-70">When</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-display text-5xl md:text-6xl text-white leading-[0.9] tracking-tight group-hover/date:text-white/90 transition-colors">{event.date}</span>
                                            <span className="font-serif italic text-2xl md:text-3xl text-white/50 mt-2">{event.time}</span>
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div className="flex flex-col gap-3 group/location">
                                        <div className="flex items-center gap-3 text-white/40 mb-1">
                                            <MapPin size={14} className="text-white/30" />
                                            <span className="font-sans text-[10px] tracking-[0.25em] uppercase opacity-70">Where</span>
                                        </div>
                                        <span className="font-display text-4xl md:text-5xl text-white leading-[1.1] group-hover/location:text-white/90 transition-colors">{event.location}</span>
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-1 text-[10px] font-sans tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors w-fit border-b border-transparent hover:border-white/50 pb-0.5"
                                        >
                                            View Map <ArrowRight size={10} />
                                        </a>
                                    </div>

                                    {/* Attire Section */}
                                    {event.outfit && (
                                        <div className="flex flex-col gap-3 group/attire md:col-span-2 pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-3 text-white/40 mb-1">
                                                <Shirt size={14} className="text-white/30" />
                                                <span className="font-sans text-[10px] tracking-[0.25em] uppercase opacity-70">Dress Code</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-display text-4xl md:text-5xl text-white leading-[1.1] group-hover/attire:text-white/90 transition-colors">
                                                    {event.outfit.type}
                                                </span>
                                                <p className="font-sans text-sm text-white/60 mt-3 max-w-2xl leading-relaxed">
                                                    {event.outfit.description} {event.outfit.colors}
                                                    {event.outfit.avoid && (
                                                        <span className="text-red-400/60 italic ml-2">
                                                            (Avoid {event.outfit.avoid.toLowerCase().replace('please avoid ', '')})
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons - Premium Minimalist */}
                                <div className="flex flex-col md:flex-row gap-4 mt-10 pt-8 border-t border-white/5">
                                    <a
                                        href={googleCalendarUrl}
                                        onClick={handleCalendarClick}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white text-black font-sans text-[11px] font-bold tracking-[0.15em] uppercase hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300"
                                    >
                                        <Calendar size={14} className="mb-0.5" />
                                        Save the Date
                                    </a>
                                    <a
                                        href={directionsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-sans text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
                                    >
                                        <ExternalLink size={14} className="mb-0.5" />
                                        Get Directions
                                    </a>
                                </div>
                            </div>

                        </motion.div>

                        {/* Visual Content / Moodboard - Multi-Stage Reveal */}
                        <motion.div
                            initial="initial"
                            whileInView="animate"
                            whileHover="hover"
                            viewport={{ once: true, margin: "-100px" }}
                            onMouseEnter={() => setIsFocused(true)}
                            onMouseLeave={() => setIsFocused(false)}
                            onClick={() => openDesktopGallery(0)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDesktopGallery(0);
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`View ${event.title} moodboard gallery. Click or press Enter to open full gallery.`}
                            className="flex-1 w-full relative h-[600px] md:h-[700px] flex items-center justify-center perspective-1000 focus:outline-none cursor-pointer"
                        >
                            {/* Decorative Circle Background */}
                            <div className={`absolute inset-0 bg-gradient-to-b ${getThemeGradient(event.theme)} opacity-20 blur-[80px] rounded-full transform scale-75`} />

                            {/* --- Permanent Aesthetic Label (Visible when NOT focused) --- */}
                            <AnimatePresence>
                                {!isFocused && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20"
                                    >
                                        <span className="font-serif italic text-lg text-white/30 tracking-wider">Moodboard & Aesthetics</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- Guidance Overlay (Visible on Focus) --- */}
                            <AnimatePresence>
                                {isFocused && (
                                    <div className="absolute inset-0 z-50 pointer-events-none">

                                        {/* Vibe Indicator (Bottom Center) */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
                                        >
                                            {/* Vertical Line */}
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 60 }}
                                                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                                className="w-[1px] bg-white/40 relative"
                                            >
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                            </motion.div>

                                            {/* Label */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4, duration: 0.8 }}
                                                className="text-center"
                                            >
                                                <span className="block font-serif italic text-2xl text-white/90">The Vibe for</span>
                                                <span className="block font-display text-lg text-white/60 tracking-widest uppercase mt-1">{event.title}</span>
                                            </motion.div>
                                        </motion.div>

                                        {/* Palette Indicator (Side) */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            style={{
                                                right: isEven ? '100%' : 'auto',
                                                left: isEven ? 'auto' : '100%',
                                                marginRight: isEven ? '4rem' : 0,
                                                marginLeft: isEven ? 0 : '4rem'
                                            }}
                                            className={`absolute top-1/2 -translate-y-1/2 flex items-center ${isEven ? 'flex-row-reverse' : 'flex-row'} gap-4`}
                                        >
                                            {/* Horizontal Line */}
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: 60 }}
                                                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                                className="h-[1px] bg-white/40 relative"
                                            >
                                                <div className={`absolute top-1/2 -translate-y-1/2 ${isEven ? 'right-0' : 'left-0'} w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]`} />
                                            </motion.div>

                                            {/* Label */}
                                            <motion.div
                                                initial={{ opacity: 0, x: isEven ? 10 : -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4, duration: 0.8 }}
                                                className={`flex flex-col ${isEven ? 'items-end' : 'items-start'}`}
                                            >
                                                <span className="block font-serif italic text-lg text-white/90 whitespace-nowrap">The Palette for</span>
                                                <span className="block font-display text-xs text-white/60 tracking-widest uppercase mt-1">{event.title}</span>
                                            </motion.div>
                                        </motion.div>

                                    </div>
                                )}
                            </AnimatePresence>

                            {/* --- Premium Palette Bar (Tilted & Interactive) --- */}
                            <motion.div
                                initial={{ opacity: 0, x: -20, rotate: -12 }}
                                whileInView={{ opacity: 1, x: 0, rotate: -12 }}
                                whileHover={{ rotate: 0, scale: 1.05 }}
                                transition={{
                                    rotate: { type: "spring", stiffness: 200, damping: 20 },
                                    opacity: { duration: 0.8 },
                                    x: { duration: 0.8 }
                                }}
                                className={`absolute top-1/2 -translate-y-1/2 ${isEven ? '-left-8 md:-left-16' : '-right-8 md:-right-16'} z-40 flex flex-col gap-4 p-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group/palette cursor-pointer`}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover/palette:bg-white/10 transition-colors">
                                        <Palette size={14} className="text-white/60" />
                                    </div>

                                    <div className="w-[1px] h-8 bg-white/10" />
                                    {event.palette ? event.palette.map((color, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ scale: 1.2 }}
                                            className="w-8 h-8 rounded-full border border-white/20 shadow-lg relative"
                                            style={{ backgroundColor: color }}
                                        >
                                            <div className="absolute inset-0 rounded-full ring-2 ring-white/0 hover:ring-white/50 transition-all duration-300" />
                                        </motion.div>
                                    )) : (
                                        <div className="w-8 h-8 rounded-full border border-white/20 shadow-lg" style={{ backgroundColor: event.colorHex }} />
                                    )}
                                </div>
                            </motion.div>

                            {/* --- Stacked Collage Images --- */}

                            {/* Hidden Images (Reveal on Hover) */}
                            {images.slice(3, 6).map((src, i) => (
                                <motion.div
                                    key={`hidden-${i}`}
                                    variants={{
                                        initial: { opacity: 0, scale: 0.5, x: 0, y: 0 },
                                        animate: { opacity: 0, scale: 0.5, x: 0, y: 0 }, // Stay hidden initially
                                        hover: {
                                            opacity: 1,
                                            scale: 0.8,
                                            x: (i === 0 ? 180 : i === 1 ? -180 : 0), // Spread out
                                            y: (i === 0 ? -120 : i === 1 ? 120 : -200),
                                            rotate: (i === 0 ? 15 : i === 1 ? -15 : 0),
                                            transition: { duration: 0.6, delay: 0.1 * i }
                                        }
                                    }}
                                    className="absolute z-0 w-48 h-64"
                                >
                                    <div className="w-full h-full overflow-hidden rounded-sm border border-white/10 shadow-xl bg-black">
                                        <img
                                            src={src}
                                            alt="Hidden Detail"
                                            loading="lazy"
                                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                                        />
                                    </div>
                                </motion.div>
                            ))}

                            {/* Image 3 (Texture) - Back of Stack (Visible) */}
                            <motion.div
                                variants={{
                                    initial: { opacity: 0, scale: 0.8, rotate: 0 },
                                    animate: { opacity: 1, scale: 0.9, rotate: -10, x: -100, y: -20, transition: { duration: 1, delay: 0.2 } },
                                    hover: { x: -160, y: -60, rotate: -15, scale: 0.95, transition: { type: "spring", stiffness: 100, damping: 20 } }
                                }}
                                className="absolute z-10 w-64 h-80 origin-bottom-right"
                            >
                                <div className="w-full h-full overflow-hidden rounded-sm border border-white/10 shadow-2xl bg-black">
                                    <img
                                        src={images[2] || images[0]}
                                        alt="Texture"
                                        loading="lazy"
                                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                                    />
                                </div>
                            </motion.div>

                            {/* Image 2 (Detail) - Middle of Stack (Visible) */}
                            <motion.div
                                variants={{
                                    initial: { opacity: 0, scale: 0.8, rotate: 0 },
                                    animate: { opacity: 1, scale: 0.95, rotate: 10, x: 100, y: 20, transition: { duration: 1, delay: 0.3 } },
                                    hover: { x: 160, y: 80, rotate: 15, scale: 0.95, transition: { type: "spring", stiffness: 100, damping: 20 } }
                                }}
                                className="absolute z-20 w-64 h-80 origin-bottom-left"
                            >
                                <div className="w-full h-full overflow-hidden rounded-sm border border-white/10 shadow-2xl bg-black">
                                    <img
                                        src={images[1] || images[0]}
                                        alt="Detail"
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-all duration-700"
                                    />
                                </div>
                            </motion.div>

                            {/* Image 1 (Main) - Front of Stack (Visible) */}
                            <motion.div
                                variants={{
                                    initial: { opacity: 0, scale: 0.9 },
                                    animate: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 1 } },
                                    hover: { scale: 1.05, transition: { duration: 0.4 } }
                                }}
                                className="relative z-30 w-72 md:w-80 h-96 md:h-[450px]"
                            >
                                <div className="w-full h-full overflow-hidden rounded-sm border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black group">
                                    <img
                                        src={images[0]}
                                        alt={event.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-30" />
                                </div>
                            </motion.div>

                        </motion.div>

                    </div>
                </div>

                {/* Desktop Gallery Modal - Full Screen */}
                <AnimatePresence>
                    {showDesktopGallery && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex items-center justify-center"
                            onClick={closeDesktopGallery}
                        >
                            {/* Radial Gradient Background Effect */}
                            <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent opacity-30 pointer-events-none" />

                            {/* Close Button */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                                onClick={closeDesktopGallery}
                                className="absolute top-8 right-8 z-50 w-16 h-16 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all duration-300 group shadow-2xl"
                                aria-label="Close gallery"
                            >
                                <X size={26} className="text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 blur-xl transition-all duration-300" />
                            </motion.button>

                            {/* Image Counter - Enhanced */}
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: 0.3 }}
                                className="absolute top-8 left-8 z-50 flex items-center gap-4"
                            >
                                <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10">
                                    <span className="font-mono text-2xl text-white font-light">{String(desktopGalleryIndex + 1).padStart(2, '0')}</span>
                                    <div className="w-8 h-[1px] bg-white/30" />
                                    <span className="font-mono text-sm text-white/40">{String(images.length).padStart(2, '0')}</span>
                                </div>
                                <span className="font-serif italic text-white/30 text-lg">{event.title}</span>
                            </motion.div>

                            {/* Zoom Controls */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: 0.4 }}
                                className="absolute top-8 right-28 z-50 flex flex-col gap-2"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                                    className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/30 transition-all duration-300 group"
                                    aria-label="Zoom in"
                                >
                                    <ZoomIn size={18} className="text-white/60 group-hover:text-white transition-colors" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                                    className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/30 transition-all duration-300 group"
                                    aria-label="Zoom out"
                                >
                                    <ZoomOut size={18} className="text-white/60 group-hover:text-white transition-colors" />
                                </button>
                                <div className="text-center mt-1">
                                    <span className="font-mono text-[10px] text-white/30">{Math.round(imageZoom * 100)}%</span>
                                </div>
                            </motion.div>

                            {/* Navigation Arrows - Left */}
                            <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: 0.3 }}
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-8 top-1/2 -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all duration-300 group shadow-2xl"
                                aria-label="Previous image"
                            >
                                <ChevronLeft size={28} className="text-white/60 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 blur-xl transition-all duration-300" />
                            </motion.button>

                            {/* Navigation Arrows - Right */}
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: 0.3 }}
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-8 top-1/2 -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all duration-300 group shadow-2xl"
                                aria-label="Next image"
                            >
                                <ChevronRight size={28} className="text-white/60 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 blur-xl transition-all duration-300" />
                            </motion.button>

                            {/* Main Image Container */}
                            <div
                                className="relative w-full h-full flex items-center justify-center p-20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={desktopGalleryIndex}
                                        initial={{ opacity: 0, scale: 0.9, rotateY: isEven ? -15 : 15 }}
                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, rotateY: isEven ? 15 : -15 }}
                                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                        className="relative max-w-full max-h-full"
                                        style={{
                                            transform: `scale(${imageZoom})`,
                                            transition: 'transform 0.3s ease'
                                        }}
                                    >
                                        <img
                                            src={images[desktopGalleryIndex]}
                                            alt={`${event.title} - Image ${desktopGalleryIndex + 1}`}
                                            className="max-w-full max-h-[80vh] object-contain rounded-sm shadow-2xl"
                                        />
                                        {/* Subtle border glow */}
                                        <div className="absolute inset-0 rounded-sm shadow-[0_0_100px_rgba(255,255,255,0.1)] pointer-events-none" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Thumbnail Navigation Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ delay: 0.4 }}
                                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
                            >
                                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                                    {images.map((img, i) => (
                                        <motion.button
                                            key={i}
                                            onClick={(e) => { e.stopPropagation(); setDesktopGalleryIndex(i); setImageZoom(1); }}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`relative overflow-hidden rounded-lg transition-all duration-300 ${i === desktopGalleryIndex
                                                ? 'w-20 h-20 ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                                : 'w-16 h-16 opacity-50 hover:opacity-80'
                                                }`}
                                            aria-label={`Go to image ${i + 1}`}
                                        >
                                            <img
                                                src={img}
                                                alt={`Thumbnail ${i + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {i === desktopGalleryIndex && (
                                                <motion.div
                                                    layoutId="activeThumbnail"
                                                    className="absolute inset-0 border-2 border-white rounded-lg"
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Keyboard Shortcuts Hint */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute bottom-8 right-8 z-50 hidden md:flex items-center gap-4 text-white/20 font-mono text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">←</kbd>
                                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">→</kbd>
                                    <span>Navigate</span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">+</kbd>
                                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">-</kbd>
                                    <span>Zoom</span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">ESC</kbd>
                                    <span>Close</span>
                                </span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </>
    );
};

export default EventSection;
