import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Play, Mic, PenTool, Plus, X, ZoomIn, ZoomOut, Check, Move, Image as ImageIcon, LayoutGrid, Sparkles } from 'lucide-react';
import { GuestbookEntry } from '../types';
import { supabase } from '../src/lib/supabase';
import DOMPurify from 'isomorphic-dompurify';
import FocusTrap from 'focus-trap-react';

// Wedding Client ID - Sanjana & Samartha
const WEDDING_CLIENT_ID = 'd4df1eff-0675-42e3-adea-b7d6b129a321';

// Initial Mock Data with Positions
const INITIAL_ENTRIES: GuestbookEntry[] = [];

const PAPER_VARIANTS = {
  cream: 'bg-[#fdfbf7] shadow-[2px_5px_15px_rgba(0,0,0,0.08)]',
  mist: 'bg-[#f4f4f6] shadow-[2px_5px_15px_rgba(0,0,0,0.08)]',
  white: 'bg-[#fffdf5] shadow-[2px_5px_15px_rgba(0,0,0,0.08)]',
  raw: 'bg-[#f2f0eb] shadow-[2px_5px_15px_rgba(0,0,0,0.08)]',
};

// Helper: Find a safe position with improved collision detection
// Enhanced Positioning Algorithm - Better Spatial Awareness
const findSafePosition = (existingEntries: GuestbookEntry[], noteType: 'text' | 'audio' | 'picture' = 'text') => {
  // Different dimensions for different note types
  // Text/Audio: w-64 (256px) square notes
  // Picture: w-80 h-96 (320px x 384px) rectangle notes
  // On a 3000px canvas: 256px = 8.5%, 320px = 10.6%, 384px = 12.8%
  const cardWidth = noteType === 'picture' ? 24 : 20; // Picture notes are wider
  const cardHeight = noteType === 'picture' ? 28 : 20; // Picture notes are taller

  // Define aesthetic cluster points using golden ratio and rule of thirds
  const goldenRatio = 1.618;
  const clusterPoints = [
    { x: 50, y: 50, weight: 1.0 },           // Center
    { x: 33.33, y: 33.33, weight: 0.8 },    // Top-left third
    { x: 66.66, y: 33.33, weight: 0.8 },    // Top-right third
    { x: 33.33, y: 66.66, weight: 0.8 },    // Bottom-left third
    { x: 66.66, y: 66.66, weight: 0.8 },    // Bottom-right third
    { x: 38.2, y: 50, weight: 0.6 },        // Golden ratio left
    { x: 61.8, y: 50, weight: 0.6 },        // Golden ratio right
    { x: 50, y: 38.2, weight: 0.6 },        // Golden ratio top
    { x: 50, y: 61.8, weight: 0.6 },        // Golden ratio bottom
  ];

  // Choose cluster based on current density
  const getClusterDensity = (point: typeof clusterPoints[0]) => {
    return existingEntries.filter(entry => {
      const distance = Math.sqrt(
        Math.pow(entry.x - point.x, 2) + Math.pow(entry.y - point.y, 2)
      );
      return distance < 25; // Increased from 20 to 25 for better density detection
    }).length;
  };

  // Sort clusters by density (prefer less dense areas)
  const sortedClusters = [...clusterPoints].sort((a, b) => {
    const densityA = getClusterDensity(a);
    const densityB = getClusterDensity(b);
    return densityA - densityB;
  });

  // Try each cluster zone
  for (const cluster of sortedClusters.slice(0, 5)) { // Try top 5 least dense
    // Spiral search from this cluster point
    let angle = Math.random() * Math.PI * 2;
    let radius = 0;
    const angleStep = goldenRatio; // Golden angle for optimal distribution
    const radiusStep = 1.2; // Increased from 0.8 for faster spiral expansion

    for (let i = 0; i < 250; i++) { // Increased from 200 to 250 iterations
      // Calculate position with golden angle spiral
      const x = cluster.x + radius * Math.cos(angle);
      const y = cluster.y + radius * Math.sin(angle);

      // Keep within canvas bounds (12% margin for better edge handling)
      if (x < 12 || x > 88 || y < 12 || y > 88) {
        angle += angleStep;
        radius += radiusStep;
        continue;
      }

      // Enhanced collision detection with rotation consideration and note type
      const hasCollision = existingEntries.some(entry => {
        const dx = Math.abs(entry.x - x);
        const dy = Math.abs(entry.y - y);

        // Get dimensions of existing entry based on its type
        const existingWidth = entry.type === 'picture' ? 24 : 20;
        const existingHeight = entry.type === 'picture' ? 28 : 20;

        // Account for rotation by adding extra padding
        const rotationPadding = 2; // Extra space for rotated cards

        // Use the larger of the two widths/heights for collision detection
        const effectiveWidth = Math.max(cardWidth, existingWidth) + rotationPadding;
        const effectiveHeight = Math.max(cardHeight, existingHeight) + rotationPadding;

        return dx < effectiveWidth && dy < effectiveHeight;
      });

      if (!hasCollision) {
        // Found a spot! Add minimal organic jitter (reduced from 3 to 2)
        return {
          x: x + (Math.random() - 0.5) * 2,
          y: y + (Math.random() - 0.5) * 2
        };
      }

      // Expand spiral using golden angle
      angle += angleStep;
      radius += radiusStep * 0.6; // Adjusted spiral growth
    }
  }

  // Ultimate fallback: random position in safe zone with better margins
  return {
    x: 15 + Math.random() * 70,
    y: 15 + Math.random() * 70
  };
};

// Celebration Confetti Component
const Confetti: React.FC<{ position: { x: number; y: number } }> = ({ position }) => {
  const particles = Array.from({ length: 30 });
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'];

  return (
    <div className="absolute inset-0 pointer-events-none z-[250]">
      {particles.map((_, i) => {
        const angle = (Math.PI * 2 * i) / particles.length;
        const velocity = 50 + Math.random() * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];

        return (
          <motion.div
            key={i}
            initial={{
              x: `${position.x}%`,
              y: `${position.y}%`,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: `${position.x + Math.cos(angle) * velocity}%`,
              y: `${position.y + Math.sin(angle) * velocity}%`,
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              ease: "easeOut"
            }}
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
};

export const Guestbook: React.FC = () => {
  const [entries, setEntries] = useState<GuestbookEntry[]>(INITIAL_ENTRIES);
  const [zoom, setZoom] = useState(0.7);
  const [isComposing, setIsComposing] = useState(false);
  const [composeType, setComposeType] = useState<'text' | 'audio' | 'picture'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPosition, setConfettiPosition] = useState({ x: 50, y: 50 });
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });

  // Organize View Feature
  const [viewMode, setViewMode] = useState<'scattered' | 'organized'>('scattered');
  const [organizedPositions, setOrganizedPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Set initial zoom for mobile (more zoomed out)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setZoom(0.45);
    }
  }, []);

  // Canvas Constraints
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom Logic
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  // Pan canvas to center on a note position
  const panToPosition = (x: number, y: number) => {
    // Virtual canvas is 3000px × 3000px, centered at 50%, 50%
    // Note position is in percentage (0-100)
    // We need to pan the canvas so the note appears centered in viewport

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const canvasSize = 3000;

    // Convert percentage to pixels on virtual canvas
    const notePosX = (x / 100) * canvasSize;
    const notePosY = (y / 100) * canvasSize;

    // Calculate offset to center the note in viewport
    // The canvas is centered at 50%, so we offset from center
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    const offsetX = -(notePosX - centerX) * zoom;
    const offsetY = -(notePosY - centerY) * zoom;

    // Clamp to drag constraints
    const clampedX = Math.max(-1000, Math.min(1000, offsetX));
    const clampedY = Math.max(-1000, Math.min(1000, offsetY));

    setCanvasPosition({ x: clampedX, y: clampedY });
  };

  // Calculate organized masonry grid positions
  const calculateOrganizedPositions = (entriesToOrganize: GuestbookEntry[]) => {
    const positions = new Map<string, { x: number; y: number }>();

    if (entriesToOrganize.length === 0) return positions;

    // Determine adaptive parameters based on viewport and note count
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 768;
    const isLandscape = window.innerHeight < window.innerWidth && isMobile;

    // Adaptive column count based on screen size
    const columnCount = entriesToOrganize.length === 1 ? 1 :
      isLandscape ? 3 :
        isMobile ? 2 :
          viewportWidth < 1024 ? 3 :
            viewportWidth < 1440 ? 4 : 5;

    // Adaptive spacing based on note count (percentage of canvas)
    const baseGap = entriesToOrganize.length < 10 ? 3 :
      entriesToOrganize.length < 30 ? 2.5 :
        2;

    // Calculate grid dimensions (percentage-based for canvas compatibility)
    const columnWidth = 90 / columnCount; // 90% usable width, 5% margins each side
    const startX = 5; // 5% left margin

    // Track column heights for masonry stacking (start 10% from top)
    const columnHeights = new Array(columnCount).fill(10);

    // Place each note in shortest column (masonry algorithm)
    entriesToOrganize.forEach((entry) => {
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));

      // Position note in center of its column
      const x = startX + (shortestCol * columnWidth) + (columnWidth / 2);
      const y = columnHeights[shortestCol];

      positions.set(entry.id, { x, y });

      // Update column height based on note type
      // Picture notes are taller (384px) vs text/audio (256px) on 3000px canvas
      const noteHeight = entry.type === 'picture' ?
        (384 / 3000) * 100 : // Picture notes taller
        (256 / 3000) * 100;  // Text/audio square

      columnHeights[shortestCol] += noteHeight + baseGap;
    });

    return positions;
  };

  // Calculate bounds and center of positions
  const calculateBounds = (positions: Map<string, { x: number; y: number }> | GuestbookEntry[], isEntryArray = false) => {
    if (!isEntryArray && (positions as Map<string, any>).size === 0) return null;
    if (isEntryArray && (positions as GuestbookEntry[]).length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    if (isEntryArray) {
      (positions as GuestbookEntry[]).forEach(entry => {
        minX = Math.min(minX, entry.x);
        maxX = Math.max(maxX, entry.x);
        minY = Math.min(minY, entry.y);
        maxY = Math.max(maxY, entry.y);
      });
    } else {
      (positions as Map<string, { x: number; y: number }>).forEach(pos => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      });
    }

    // Add padding for note dimensions (notes are positioned by their center)
    // Text/audio notes: ~8.5% width, Picture notes: ~12.8% width
    // Adding 15% padding on each side to account for note size
    const paddingX = 15;
    const paddingY = 15;

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
      width: (maxX - minX) + (paddingX * 2),
      height: (maxY - minY) + (paddingY * 2),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  };

  // Toggle between scattered and organized view
  const handleToggleView = () => {
    if (viewMode === 'scattered') {
      // Calculate organized positions
      const positions = calculateOrganizedPositions(entries);
      setOrganizedPositions(positions);
      setViewMode('organized');

      // Calculate bounds of organized grid
      const bounds = calculateBounds(positions);
      if (!bounds) return;

      // Determine if mobile
      const isMobile = window.innerWidth < 768;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate optimal zoom to fit all notes in viewport
      // Canvas is 3000px, bounds are in percentages
      const canvasSize = 3000;
      const gridWidthPx = (bounds.width / 100) * canvasSize;
      const gridHeightPx = (bounds.height / 100) * canvasSize;

      // Calculate zoom needed to fit width and height
      const zoomToFitWidth = (viewportWidth * 0.9) / gridWidthPx; // 90% of viewport
      const zoomToFitHeight = (viewportHeight * 0.85) / gridHeightPx; // 85% of viewport (leave room for UI)

      // Use the smaller zoom to ensure everything fits
      const optimalZoom = Math.min(zoomToFitWidth, zoomToFitHeight);

      // Clamp zoom to reasonable bounds (0.3 to 1.5)
      const newZoom = Math.max(0.3, Math.min(1.5, optimalZoom));

      // Set zoom first, then pan
      setZoom(newZoom);

      // Pan to center of organized grid
      setTimeout(() => {
        panToPosition(bounds.centerX, bounds.centerY);
      }, 100);
    } else {
      setViewMode('scattered');

      // Calculate bounds of scattered notes
      const bounds = calculateBounds(entries, true);

      if (bounds) {
        // For scattered view, use moderate zoom and pan to center
        const isMobile = window.innerWidth < 768;
        setZoom(isMobile ? 0.45 : 0.7);

        setTimeout(() => {
          panToPosition(bounds.centerX, bounds.centerY);
        }, 100);
      } else {
        // Fallback to canvas center if no entries
        setZoom(window.innerWidth < 768 ? 0.45 : 0.7);
        setTimeout(() => {
          panToPosition(50, 50);
        }, 100);
      }
    }
  };

  // Recalculate organized positions on window resize (debounced)
  useEffect(() => {
    if (viewMode !== 'organized') return;

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const positions = calculateOrganizedPositions(entries);
        setOrganizedPositions(positions);
      }, 300); // 300ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [viewMode, entries]);

  // Add Note Logic
  // Fetch & Subscribe
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        // Fetch only guestbook entries for this wedding (Sanjana & Samartha)
        const { data, error } = await supabase
          .from('guestbook_entries')
          .select('*')
          .eq('client_id', WEDDING_CLIENT_ID)
          .order('created_at', { ascending: false });

        if (error) {
          // Silently log error without showing to user
          console.warn('Guestbook data fetch issue:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const mappedData = data.map((item: any) => ({
            ...item,
            timestamp: new Date(item.created_at).toLocaleDateString() // Simple formatting
          }));
          setEntries(mappedData);
        }
      } catch (err) {
        // Silently handle errors
        console.warn('Guestbook error:', err);
      }
    };

    fetchEntries();

    // Real-time subscription - only for this wedding (silently handle errors)
    try {
      const channel = supabase
        .channel('guestbook_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook_entries' }, (payload) => {
          const newItem = payload.new as any;
          // Only add if it's for this wedding (Sanjana & Samartha)
          if (newItem.client_id === WEDDING_CLIENT_ID) {
            const mappedItem: GuestbookEntry = {
              ...newItem,
              timestamp: 'Just now' // Realtime updates are always recent
            };

            // Prevent duplicates - only add if this ID doesn't already exist
            // This prevents duplicate entries when user posts their own note
            setEntries((prev) => {
              const exists = prev.some(entry => entry.id === newItem.id);
              if (exists) {
                return prev; // Already exists (optimistic update), don't add again
              }
              return [mappedItem, ...prev];
            });
          }
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime subscription error - continuing without live updates');
          }
        });

      return () => {
        supabase.removeChannel(channel).catch(() => { });
      };
    } catch (err) {
      console.warn('Could not establish realtime connection:', err);
      return () => { };
    }
  }, []);

  // Add Note Logic
  const handleAddNote = async (data: any) => {
    // Sanitize inputs to prevent XSS attacks
    const sanitizedName = DOMPurify.sanitize(data.name || 'Guest', { ALLOWED_TAGS: [] });
    const sanitizedMessage = DOMPurify.sanitize(data.message || '', { ALLOWED_TAGS: [] });

    // Validation: Ensure message is not empty for text notes
    if (composeType === 'text' && !sanitizedMessage.trim()) {
      alert('Please write a message before posting.');
      return;
    }

    // Validation: Ensure image is selected for picture notes
    if (composeType === 'picture' && !data.imageBlob) {
      alert('Please select an image before posting.');
      return;
    }

    // Validation: Caption max 50 characters for picture notes
    if (composeType === 'picture' && sanitizedMessage.length > 50) {
      alert('Picture caption must be 50 characters or less.');
      return;
    }

    const tempId = crypto.randomUUID();
    const { x, y } = findSafePosition(entries, composeType);

    // Instantly pan canvas to show where note will appear
    panToPosition(x, y);

    // Show target preview
    setTargetPosition({ x, y });

    // Create temporary blob URLs for instant display
    const tempAudioUrl = data.audioBlob ? URL.createObjectURL(data.audioBlob) : null;
    const tempImageUrl = data.imageBlob ? URL.createObjectURL(data.imageBlob) : null;

    const newEntry: GuestbookEntry = {
      id: tempId,
      name: sanitizedName,
      message: sanitizedMessage || (composeType === 'audio' ? 'Audio Note' : ''),
      timestamp: 'Just now',
      type: composeType,
      audio_url: tempAudioUrl, // Use temporary blob URL for instant playback
      image_url: tempImageUrl, // Use temporary blob URL for instant display
      duration: data.duration, // Use actual recorded duration
      x,
      y,
      rotation: Math.random() * 10 - 5,
      variant: Object.keys(PAPER_VARIANTS)[Math.floor(Math.random() * 4)] as any,
      client_id: WEDDING_CLIENT_ID,
    };

    // Brief delay to show target, then add note
    setTimeout(() => {
      // 1. Optimistic Update (Immediate Show)
      setEntries(prev => [newEntry, ...prev]);
      setIsComposing(false);

      // Hide target
      setTargetPosition(null);

      // Trigger confetti celebration at note position (after note lands)
      setTimeout(() => {
        setConfettiPosition({ x, y });
        setShowConfetti(true);

        // Optional: Play a subtle "stick" sound (paper sound)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fHVfzQGHm654+mhTgwOVLDn77BdGAg+ktbyy3YrBSh+zPLaizsIGGe96+yXTAwOUKXh8bllHAU7k9jyz34zBiF3yO/dkUALFF614+qnVRQKRp/e8L1rIAYygdDx0n0zBiBxw+zglEILEVuz5+ynUxQLSKXe77tmHgU3j9Xx0noxBSV8yu/bmjsJGGq75OuaUQ0NTqnn7bddGwY7kdXyz4AyBSJ4y+/fm0IMFV++4+qmUhMJSKDb8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHwU7kdXyz4AyBSJ4y+/fm0IMFV614+qmUhMJRZ7c8btjHQU7jtTxz34zBiFzxezglEEMEVyz5OyoURQLR6Xe8L5pHw==');
          audio.volume = 0.3;
          audio.play().catch(() => { }); // Ignore if autoplay blocked
        } catch (e) {
          // Silently ignore audio errors
        }

        setTimeout(() => setShowConfetti(false), 1000);
      }, 900); // After animation mostly complete
    }, 300);

    try {
      // 2. Background Upload & Save
      let audioUrl = null;
      let imageUrl = null;

      // Upload audio if present
      if (data.audioBlob) {
        try {
          // Use unique filename to prevent collisions
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('guestbook-audio')
            .upload(fileName, data.audioBlob);

          if (uploadError) {
            console.warn(`Audio upload failed: ${uploadError.message}`);
            console.warn('Note will be saved without audio. Please create the guestbook-audio storage bucket.');
            // Continue without audio - save the text note
          } else if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('guestbook-audio')
              .getPublicUrl(fileName);
            audioUrl = publicUrl;
          }
        } catch (audioError: any) {
          console.warn('Audio upload error:', audioError);
          // Continue without audio
        }
      }

      // Upload image if present
      if (data.imageBlob) {
        try {
          // Use unique filename with proper extension
          const fileExtension = data.imageBlob.type.split('/')[1] || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

          console.log('Uploading image to Supabase storage...', {
            bucket: 'guestbook-images',
            fileName,
            fileType: data.imageBlob.type,
            fileSize: data.imageBlob.size
          });

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('guestbook-images')
            .upload(fileName, data.imageBlob, {
              contentType: data.imageBlob.type,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Image upload failed:`, uploadError);
            console.error('Error details:', {
              message: uploadError.message,
              name: uploadError.name,
              // @ts-ignore
              statusCode: uploadError.statusCode,
              // @ts-ignore
              error: uploadError.error
            });
            console.warn('Note will be saved without image. Please ensure the guestbook-images storage bucket exists and has proper policies.');
            // Continue without image - the note will show "Image unavailable"
          } else if (uploadData) {
            console.log('Image uploaded successfully:', uploadData);
            const { data: { publicUrl } } = supabase.storage
              .from('guestbook-images')
              .getPublicUrl(fileName);
            imageUrl = publicUrl;
            console.log('Public URL generated:', imageUrl);
          }
        } catch (imageError: any) {
          console.error('Image upload exception:', imageError);
          // Continue without image
        }
      }

      // 3. Final DB Insert
      // Exclude 'id' (let DB generate it) and 'timestamp' (DB uses created_at)
      const { id, timestamp, ...dbEntry } = newEntry;

      const { data: insertData, error: insertError } = await supabase.from('guestbook_entries').insert([{
        ...dbEntry,
        audio_url: audioUrl,
        image_url: imageUrl
      }]).select();

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // 4. Update optimistic entry with real data from database
      if (insertData && insertData.length > 0) {
        const savedEntry = insertData[0];

        setEntries(prev => prev.map(entry => {
          if (entry.id === tempId) {
            // Replace temp entry with real database entry
            // Only revoke temporary blob URLs if we have permanent URLs from upload
            // Otherwise keep the temporary URLs for instant display
            const finalAudioUrl = savedEntry.audio_url || entry.audio_url;
            const finalImageUrl = savedEntry.image_url || entry.image_url;

            // Revoke blob URLs only if we're replacing them with permanent URLs
            if (tempAudioUrl && savedEntry.audio_url) {
              URL.revokeObjectURL(tempAudioUrl);
            }
            if (tempImageUrl && savedEntry.image_url) {
              URL.revokeObjectURL(tempImageUrl);
            }

            return {
              ...savedEntry,
              audio_url: finalAudioUrl,
              image_url: finalImageUrl,
              timestamp: 'Just now',
              x: entry.x, // Keep original position
              y: entry.y,
              rotation: entry.rotation,
              variant: entry.variant
            };
          }
          return entry;
        }));
      }

      // Success! Note is saved
      console.log('Note saved successfully');

    } catch (error: any) {
      // Remove the optimistically added note on failure
      setEntries(prev => prev.filter(entry => entry.id !== tempId));

      // Silently log error for debugging
      console.warn("Note save error:", error.message || error);

      // Show simple user-friendly message without technical details
      alert("Unable to save your note. Please try again.");
    }
  };

  // Pinch to Zoom Logic
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialPinchDistance.current = dist;
      initialZoom.current = zoom;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scaleFactor = dist / initialPinchDistance.current;
      const newZoom = Math.min(Math.max(initialZoom.current * scaleFactor, 0.5), 2);
      setZoom(newZoom);
    }
  };

  const onTouchEnd = () => {
    initialPinchDistance.current = null;
  };

  return (
    <section className="relative h-screen bg-[#E5E5E0] overflow-hidden">

      {/* 1. Infinite Canvas Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-multiply pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[#E5E5E0]" />

      {/* 2. Draggable Wall Container */}
      <motion.div
        ref={containerRef}
        className="absolute w-full h-full cursor-grab active:cursor-grabbing z-10 touch-none"
        drag
        dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
        dragElastic={0.1}
        animate={canvasPosition}
        style={{ scale: zoom }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Virtual Large Surface */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3000px] h-[3000px]">

          {/* Target Preview - Shows where note will land */}
          {targetPosition && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute pointer-events-none"
              style={{
                left: `${targetPosition.x}%`,
                top: `${targetPosition.y}%`,
              }}
            >
              {/* Ripple rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ scale: [1, 2, 3], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="w-32 h-32 rounded-full border-2 border-yellow-400"
                />
                <motion.div
                  animate={{ scale: [1, 2, 3], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 0.6, delay: 0.2, repeat: Infinity }}
                  className="absolute top-0 left-0 w-32 h-32 rounded-full border-2 border-yellow-400"
                />
              </div>
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50" />
            </motion.div>
          )}

          {/* Notes - Render all for simplicity, browser handles large DOM well */}
          {entries.map((entry) => (
            <StickyNote
              key={entry.id}
              entry={entry}
              viewMode={viewMode}
              organizedPositions={organizedPositions}
            />
          ))}

          {/* Empty State */}
          {entries.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="font-fashion italic text-2xl text-gray-600 mb-2">No notes yet</p>
              <p className="font-sans text-sm text-gray-400">Be the first to leave a message!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Confetti Celebration */}
      {showConfetti && <Confetti position={confettiPosition} />}

      {/* 3. Overlay UI (Controls) */}
      <div className="absolute inset-0 z-50 pointer-events-none">

        {/* Header */}
        <div className="absolute top-8 md:top-12 left-0 w-full text-center pointer-events-auto px-4">
          <span className="font-sans text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.4em] uppercase text-gray-400 block mb-2">Interactive Canvas</span>
          <h2 className="font-fashion italic text-2xl md:text-3xl lg:text-4xl text-gray-800">The Wall of Voices</h2>
          <p className="font-sans text-[9px] md:text-[10px] text-gray-400 mt-1.5 md:mt-2">Drag to explore • Pinch to zoom</p>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-8 left-4 md:bottom-12 md:left-12 flex flex-col gap-2 pointer-events-auto">
          <button onClick={() => handleZoom(0.2)} className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors border border-black/5 text-gray-600">
            <ZoomIn size={20} />
          </button>
          <button onClick={() => handleZoom(-0.2)} className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors border border-black/5 text-gray-600">
            <ZoomOut size={20} />
          </button>
        </div>

        {/* Action Buttons - Stack vertically on mobile, horizontal on desktop */}
        <div className="absolute bottom-8 right-4 md:bottom-12 md:right-12 flex flex-col-reverse md:flex-row gap-3 pointer-events-auto">

          {/* Organize/Scatter Toggle Button - Only show if there are notes */}
          {entries.length > 0 && (
            <button
              onClick={handleToggleView}
              className="group flex items-center gap-2 md:gap-3 pl-3 md:pl-4 pr-4 md:pr-6 py-3 md:py-4 bg-white/90 backdrop-blur-md border border-black/10 text-gray-800 rounded-full shadow-lg hover:bg-white hover:scale-105 transition-all duration-300 min-h-[44px]"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/10 flex items-center justify-center">
                {viewMode === 'scattered' ? (
                  <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                ) : (
                  <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
                )}
              </div>
              <span className="font-sans text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase">
                {viewMode === 'scattered' ? 'Organize' : 'Scatter'}
              </span>
            </button>
          )}

          {/* Leave a Note Button */}
          <button
            onClick={() => setIsComposing(true)}
            className="group flex items-center gap-2 md:gap-3 pl-3 md:pl-4 pr-4 md:pr-6 py-3 md:py-4 bg-black text-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 transition-all duration-300 min-h-[44px]"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            <span className="font-sans text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase">Leave a Note</span>
          </button>
        </div>
      </div>

      {/* 4. Compose Modal */}
      <AnimatePresence>
        {isComposing && (
          <ComposeModal
            onClose={() => setIsComposing(false)}
            onSave={handleAddNote}
            type={composeType}
            setType={setComposeType}
          />
        )}
      </AnimatePresence>

    </section>
  );
};

// --- Sub-Components ---

const StickyNote: React.FC<{
  entry: GuestbookEntry;
  viewMode: 'scattered' | 'organized';
  organizedPositions: Map<string, { x: number; y: number }>;
}> = ({ entry, viewMode, organizedPositions }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTape, setShowTape] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const style = PAPER_VARIANTS[entry.variant];

  // Determine if this is a new note (just added)
  const isNewNote = entry.timestamp === 'Just now';

  // Calculate active position based on current view mode
  const getActivePosition = () => {
    if (viewMode === 'organized' && organizedPositions.has(entry.id)) {
      const pos = organizedPositions.get(entry.id)!;
      return { x: pos.x, y: pos.y, rotation: 0 }; // Straighten rotation in organized view
    }
    return { x: entry.x, y: entry.y, rotation: entry.rotation }; // Use scattered position
  };

  const activePos = getActivePosition();

  // Initialize audio for audio notes
  useEffect(() => {
    if (entry.type === 'audio' && entry.audio_url && !audioRef.current) {
      try {
        audioRef.current = new Audio(entry.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          console.warn('Audio failed to load:', entry.audio_url);
          setAudioError(true);
        };
      } catch (error) {
        console.warn('Error initializing audio:', error);
        setAudioError(true);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [entry.type, entry.audio_url]);

  const togglePlay = () => {
    if (!entry.audio_url || audioError) {
      console.warn('No audio URL available or audio failed to load');
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.warn('Audio playback failed:', error);
            setAudioError(true);
          });
      }
    }
  };

  // Beautiful multi-stage stick animation with PASTE action
  const stickAnimation = isNewNote ? {
    initial: {
      x: '50vw',  // Start from center (where modal is)
      y: '50vh',
      scale: 0,
      rotate: Math.random() * 360 - 180, // Random rotation during flight
      opacity: 0,
      zIndex: 200,
    },
    animate: {
      x: 0,
      y: 0,
      // Enhanced scale sequence: fly → hover → PRESS DOWN → release → settle
      scale: [
        0,      // Start invisible
        1.2,    // Grow during flight
        1.1,    // Hover above surface
        0.92,   // SQUASH (pressing down) ⭐
        1.08,   // Release bounce up
        0.98,   // Settle squash
        1.02,   // Final micro-bounce
        1       // Rest
      ],
      rotate: entry.rotation,
      opacity: 1,
      zIndex: 1, // Returns to normal after animation
    },
    transition: {
      duration: 1.8,  // Longer for paste action
      x: { type: "spring", stiffness: 100, damping: 15 },
      y: { type: "spring", stiffness: 100, damping: 15 },
      rotate: {
        type: "spring",
        stiffness: 200,
        damping: 20,
      },
      scale: {
        type: "keyframes",  // Use keyframes for multi-step animation
        duration: 1.8,
        times: [0, 0.35, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
        ease: [0.34, 1.56, 0.64, 1],
      },
      opacity: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  } : {
    initial: { scale: 1, opacity: 1, zIndex: 1 },
    animate: { scale: 1, opacity: 1, zIndex: 1 },
    transition: {}
  };

  return (
    <motion.div
      {...stickAnimation}
      // Position and rotation animation (for both new notes and view mode transitions)
      animate={isNewNote ? {
        ...stickAnimation.animate,
        left: `${activePos.x}%`,
        top: `${activePos.y}%`,
        rotate: activePos.rotation,
        scaleY: [1, 1, 1, 0.85, 1.05, 0.98, 1.01, 1], // Squash on press
        scaleX: [1, 1, 1, 1.08, 0.98, 1.01, 1, 1],    // Stretch horizontally
      } : {
        left: `${activePos.x}%`,
        top: `${activePos.y}%`,
        rotate: activePos.rotation
      }}
      transition={isNewNote ? {
        ...stickAnimation.transition,
        scaleY: {
          type: "keyframes",
          duration: 1.8,
          times: [0, 0.35, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
          ease: "easeInOut"
        },
        scaleX: {
          type: "keyframes",
          duration: 1.8,
          times: [0, 0.35, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
          ease: "easeInOut"
        }
      } : {
        type: "spring",
        stiffness: 150,
        damping: 25,
        duration: 0.8
      }}
      onAnimationComplete={() => {
        if (isNewNote) {
          // Show tape after note lands and is pressed
          setTimeout(() => setShowTape(true), 100);
        } else {
          setShowTape(true);
        }
      }}
      whileHover={{ scale: 1.1, zIndex: 50, rotate: 0, transition: { duration: 0.2 } }}
      className={`absolute ${entry.type === 'picture' ? 'w-80 h-96' : 'w-64'} p-6 ${style} transform-gpu cursor-pointer`}
      style={{
        left: `${entry.x}%`,
        top: `${entry.y}%`,
      }}
    >
      {/* Drop Shadow - appears during landing */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isNewNote ? 0.15 : 0.15 }}
        transition={{ delay: isNewNote ? 0.8 : 0 }}
        className="absolute -bottom-2 left-2 right-2 h-4 bg-black rounded-full blur-md"
      />

      {/* Paper Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-multiply pointer-events-none rounded-sm" />

      {/* Tape Visual - appears after landing with pop effect */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: showTape ? 1 : 0, opacity: showTape ? 1 : 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 15,
          delay: isNewNote ? 0.1 : 0
        }}
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 bg-white/30 backdrop-blur-[1px] rotate-1 shadow-sm border border-white/20"
      />

      {/* Press impact flash - appears when note makes contact */}
      {isNewNote && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 3], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.4, delay: 0.65 }} // During press-down
          className="absolute inset-0 -m-8 rounded-full bg-yellow-300 pointer-events-none z-[-1]"
        />
      )}

      {/* Sparkle effect on new notes - after paste */}
      {isNewNote && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400"
          >
            ✨
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="absolute -bottom-2 -left-2 w-4 h-4 text-yellow-400"
          >
            ✨
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 1.25 }}
            className="absolute -top-2 -left-2 w-4 h-4 text-yellow-400"
          >
            ✨
          </motion.div>
        </>
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-4 border-b border-black/5 pb-2">
        <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-gray-800">{entry.name}</span>
        <span className="font-mono text-[8px] text-gray-400">{entry.timestamp}</span>
      </div>

      {/* Content */}
      {entry.type === 'picture' ? (
        // Picture note - rectangle layout with image and caption
        <div className="flex flex-col h-full">
          {!entry.image_url ? (
            // Fallback for picture notes without URL (upload failed)
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <ImageIcon size={16} className="opacity-50" />
                <span className="font-mono text-[10px]">Image unavailable</span>
              </div>
              {entry.message && (
                <p className="font-hand text-lg text-gray-600 leading-snug break-words mt-2">
                  {entry.message}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Image Container */}
              <div className="relative w-full h-52 rounded-sm overflow-hidden mb-3 bg-gray-100">
                <img
                  src={entry.image_url}
                  alt={entry.message || 'Picture note'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Caption */}
              {entry.message && (
                <p className="font-hand text-lg text-gray-800 leading-snug break-words text-center">
                  {entry.message}
                </p>
              )}
            </>
          )}
        </div>
      ) : entry.type === 'audio' ? (
        <>
          {!entry.audio_url ? (
            // Fallback for audio notes without URL (upload failed)
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Mic size={16} className="opacity-50" />
                <span className="font-mono text-[10px]">Audio unavailable</span>
              </div>
              {entry.message && entry.message !== 'Audio Note' && (
                <p className="font-hand text-xl text-gray-600 leading-snug break-words mt-2">
                  {entry.message}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={audioError}
                className={`w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center transition-transform ${audioError
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-110'
                  }`}
                title={audioError ? 'Audio failed to load' : 'Play audio'}
              >
                {isPlaying ? (
                  <div className="w-2 h-2 bg-white rounded-sm animate-pulse" />
                ) : (
                  <Play size={10} fill="currentColor" />
                )}
              </button>
              <div className="flex-1 flex items-center gap-[2px] h-6 opacity-50">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[2px] bg-black rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''
                      }`}
                    style={{ height: `${20 + Math.random() * 80}%` }}
                  />
                ))}
              </div>
              {entry.duration && (
                <span className="font-mono text-[10px] text-gray-400">{entry.duration}</span>
              )}
            </div>
          )}
        </>
      ) : (
        // Text note
        <p className="font-hand text-2xl text-gray-800 leading-snug break-words">
          {entry.message}
        </p>
      )}
    </motion.div>
  );
};

// Helper function to format duration in mm:ss
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ComposeModal: React.FC<{ onClose: () => void, onSave: (data: any) => void, type: 'text' | 'audio' | 'picture', setType: any }> = ({ onClose, onSave, type, setType }) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Start timer
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);

      // Update duration every 100ms for smooth display
      timerIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
          setRecordingDuration(elapsed);
        }
      }, 100);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());

        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Finalize duration
      if (recordingStartTimeRef.current) {
        const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        setRecordingDuration(finalDuration);
        recordingStartTimeRef.current = null;
      }

      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Cleanup image preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Revoke previous preview URL if exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // Create preview URL and store blob
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageBlob(file);
  };

  return (
    <FocusTrap>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="relative z-10 w-full max-w-md bg-[#fdfbf7] p-8 shadow-2xl rounded-sm"
        >
          {/* Texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-multiply pointer-events-none" />

          {/* Type Selector */}
          <div className="relative flex justify-center gap-6 mb-8 border-b border-black/5 pb-6">
            <button
              onClick={() => setType('text')}
              className={`flex flex-col items-center gap-2 transition-colors ${type === 'text' ? 'text-black' : 'text-gray-400'}`}
            >
              <PenTool size={20} />
              <span className="font-sans text-[10px] tracking-widest uppercase">Write</span>
            </button>
            <button
              onClick={() => setType('audio')}
              className={`flex flex-col items-center gap-2 transition-colors ${type === 'audio' ? 'text-black' : 'text-gray-400'}`}
            >
              <Mic size={20} />
              <span className="font-sans text-[10px] tracking-widest uppercase">Record</span>
            </button>
            <button
              onClick={() => setType('picture')}
              className={`flex flex-col items-center gap-2 transition-colors ${type === 'picture' ? 'text-black' : 'text-gray-400'}`}
            >
              <ImageIcon size={20} />
              <span className="font-sans text-[10px] tracking-widest uppercase">Picture</span>
            </button>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label htmlFor="guestbook-name" className="sr-only">Your Name</label>
            <input
              id="guestbook-name"
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-required="true"
              aria-label="Your name for the guestbook entry"
              className="w-full bg-transparent border-b border-black/10 py-2 text-center font-display text-xl text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-black/30 transition-colors"
            />
          </div>

          {/* Input Area */}
          <div className="min-h-[200px] flex items-center justify-center">
            {type === 'text' ? (
              <div className="w-full relative">
                <label htmlFor="guestbook-message" className="sr-only">Your Message</label>
                <textarea
                  id="guestbook-message"
                  placeholder="Write a message for the couple..."
                  className="w-full h-40 bg-transparent border-none resize-none font-hand text-3xl text-gray-800 placeholder:text-gray-300 focus:ring-0 text-center"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={100}
                  autoFocus
                  aria-label="Your message for the couple"
                  aria-describedby="message-counter"
                />
                <div id="message-counter" className="text-center font-mono text-[10px] text-gray-400 mt-2" aria-live="polite">
                  {text.length}/100 characters
                </div>
              </div>
            ) : type === 'audio' ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 border-red-600 animate-pulse' : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'}`}
                >
                  <Mic size={32} className={isRecording ? 'text-white' : 'text-red-500'} />
                </button>
                <div className="flex flex-col items-center gap-2">
                  {isRecording && (
                    <span className="font-mono text-lg font-bold text-red-500">
                      {formatDuration(recordingDuration)}
                    </span>
                  )}
                  <span className="font-mono text-xs text-gray-400">
                    {isRecording ? 'Recording... Tap to Stop' : (audioBlob ? `Recorded (${formatDuration(recordingDuration)})` : 'Tap to Record')}
                  </span>
                </div>
                {audioBlob && (
                  <audio controls src={URL.createObjectURL(audioBlob)} className="mt-2 h-8 w-48" />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Image preview or upload button */}
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-sm border-2 border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setImageBlob(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-sm hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon size={32} className="text-gray-400" />
                    <span className="font-sans text-xs text-gray-400">Click to select image</span>
                    <span className="font-mono text-[10px] text-gray-300">Max 5MB</span>
                  </button>
                )}

                {/* Caption input (max 50 characters) */}
                <div className="w-full">
                  <input
                    type="text"
                    placeholder="Caption (optional, max 50 chars)"
                    className="w-full bg-transparent border-b border-black/10 py-2 text-center font-hand text-lg text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-black/30 transition-colors"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={50}
                  />
                  <div className="text-center font-mono text-[10px] text-gray-400 mt-1">
                    {text.length}/50 characters
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-black/5">
            <button onClick={onClose} className="p-3 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <button
              onClick={() => onSave({
                name,
                message: text,
                audioBlob,
                imageBlob,
                duration: type === 'audio' && audioBlob ? formatDuration(recordingDuration) : undefined
              })}
              disabled={
                !name.trim() ||
                (type === 'audio' && !audioBlob) ||
                (type === 'text' && !text.trim()) ||
                (type === 'picture' && !imageBlob)
              }
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-sans text-[10px] tracking-widest uppercase">Post Note</span>
              <Check size={14} />
            </button>
          </div>

        </motion.div>
      </div>
    </FocusTrap>
  );
};
