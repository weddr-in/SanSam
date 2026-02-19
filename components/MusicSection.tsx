import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Plus, Check, Disc, Loader2, Trophy, Droplets, Sparkles, Zap, Heart, Activity } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { searchTracks, getClientAccessToken } from '../lib/spotify';

// --- Types ---
interface Track {
    trackId: string | number;
    trackName: string;
    artistName: string;
    artworkUrl100: string;
    collectionName: string;
}

interface Request {
    id: number;
    track_name: string;
    artist_name: string;
    album_art: string;
    vote_count: number;
}

type EventId = 'reception' | 'muhurtham';

const EVENTS: { id: EventId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'reception', label: 'Reception', icon: <Droplets size={16} />, color: '#0047AB' },
    { id: 'muhurtham', label: 'Muhurtham', icon: <Sparkles size={16} />, color: '#FFD700' },
];

// Wedding Client ID - Sanjana & Samartha
const WEDDING_CLIENT_ID = 'd4df1eff-0675-42e3-adea-b7d6b129a321';

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export const MusicSection: React.FC = () => {
    // State
    const [selectedEvent, setSelectedEvent] = useState<EventId>('reception');
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 500); // 500ms delay for instant search
    const [results, setResults] = useState<Track[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [topRequests, setTopRequests] = useState<Request[]>([]);
    const [allRequests, setAllRequests] = useState<Request[]>([]);
    const [showAllModal, setShowAllModal] = useState(false);
    const [addedTracks, setAddedTracks] = useState<Set<string | number>>(new Set());
    const [showSuccess, setShowSuccess] = useState(false); // Success Animation State
    const [error, setError] = useState<string | null>(null); // Error State

    // --- Effects ---

    // 1. Fetch Top Requests when Event changes
    useEffect(() => {
        fetchTopRequests();

        // Real-time subscription for voting updates
        console.log('Setting up real-time subscription for event:', selectedEvent);
        const channel = supabase
            .channel(`public:song_requests:${selectedEvent}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${selectedEvent}` }, (payload) => {
                console.log('Real-time update received:', payload.eventType, payload);
                fetchTopRequests();
            })
            .subscribe((status, err) => {
                console.log('Subscription status:', status);
                if (err) {
                    console.error('Subscription error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to song_requests changes');
                }
            });

        return () => {
            console.log('Cleaning up subscription for event:', selectedEvent);
            supabase.removeChannel(channel);
        };
    }, [selectedEvent]);

    // 2. Instant Search (Debounced)
    useEffect(() => {
        if (debouncedQuery.trim()) {
            performSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    // --- Functions ---

    const fetchTopRequests = async () => {
        console.log('Fetching top requests for event:', selectedEvent);
        try {
            const { data, error } = await supabase
                .from('song_requests')
                .select('*')
                .eq('client_id', WEDDING_CLIENT_ID)
                .eq('event_id', selectedEvent)
                .order('vote_count', { ascending: false }) // Rank by votes
                .limit(5);

            if (error) {
                console.error('Supabase fetch top requests error:', error);
                setError(`Failed to load songs: ${error.message}`);
                return;
            }

            console.log('Fetched top requests:', data?.length || 0, 'songs');
            if (data) setTopRequests(data);
        } catch (err: any) {
            console.error('Fetch top requests exception:', err);
            setError(err.message || 'Failed to load songs');
        }
    };

    const performSearch = async (searchTerm: string) => {
        setIsSearching(true);
        setError(null); // Clear previous errors
        try {
            const data = await searchTracks(searchTerm);

            if (data.tracks && data.tracks.items) {
                const tracks = data.tracks.items;

                // Map Spotify format to our Track interface
                const mappedResults = tracks.map((item: any) => ({
                    trackId: item.id,
                    trackName: item.name,
                    artistName: item.artists[0].name,
                    artworkUrl100: item.album.images[0]?.url || '',
                    collectionName: item.album.name,
                }));
                setResults(mappedResults);
            } else {
                setResults([]);
            }
        } catch (error: any) {
            console.error('Search failed:', error);
            setResults([]);
            // Show the actual error message to help debugging
            setError(error.message || 'Unable to search music. Please check your connection.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async (track: Track) => {
        try {
            setAddedTracks(prev => new Set(prev).add(track.trackId));
            setError(null);

            const newUri = `spotify:track:${track.trackId}`;
            const oldUri = `spotify:${track.trackId}`;

            console.log('Adding song to Supabase:', {
                trackName: track.trackName,
                trackId: track.trackId,
                event: selectedEvent
            });

            // 1. Check for ANY existing entry (new or old format)
            const { data: existing, error: fetchError } = await supabase
                .from('song_requests')
                .select('id, vote_count, spotify_uri')
                .eq('client_id', WEDDING_CLIENT_ID)
                .in('spotify_uri', [newUri, oldUri])
                .eq('event_id', selectedEvent)
                .maybeSingle();

            if (fetchError) {
                console.error('Supabase fetch error:', fetchError);
                throw new Error(`Failed to check existing song: ${fetchError.message}`);
            }

            if (existing) {
                console.log('Song exists, upvoting:', existing);
                // Upvote AND Normalize URI if needed
                const updates: any = { vote_count: existing.vote_count + 1 };
                if (existing.spotify_uri !== newUri) {
                    updates.spotify_uri = newUri; // Migrate to new format
                }

                const { error: updateError } = await supabase
                    .from('song_requests')
                    .update(updates)
                    .eq('id', existing.id);

                if (updateError) {
                    console.error('Supabase update error:', updateError);
                    throw new Error(`Failed to upvote song: ${updateError.message}`);
                }
                console.log('Successfully upvoted song');
            } else {
                console.log('New song, inserting...');
                // Insert New
                const { data: insertData, error: insertError } = await supabase
                    .from('song_requests')
                    .insert([{
                        track_name: track.trackName,
                        artist_name: track.artistName,
                        album_art: track.artworkUrl100,
                        spotify_uri: newUri,
                        event_id: selectedEvent,
                        vote_count: 1,
                        client_id: WEDDING_CLIENT_ID
                    }])
                    .select();

                if (insertError) {
                    console.error('Supabase insert error:', insertError);
                    throw new Error(`Failed to add song: ${insertError.message}`);
                }
                console.log('Successfully inserted song:', insertData);
            }

            // Refresh the list instantly
            await fetchTopRequests();

            // Trigger Success Animation
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Clear search
            setQuery('');
            setResults([]);

        } catch (error: any) {
            console.error('Add song failed:', error);
            setError(error.message || 'Failed to add song. Please try again.');
            setAddedTracks(prev => {
                const next = new Set(prev);
                next.delete(track.trackId);
                return next;
            });
        }
    };

    const activeColor = EVENTS.find(e => e.id === selectedEvent)?.color || '#fff';

    return (
        <section className="relative py-24 bg-[#050505] overflow-hidden border-t border-white/5">
            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.5, y: 20 }}
                            className="flex flex-col items-center gap-4"
                        >
                            {/* Vinyl Disc with Spin Animation */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, ease: "linear" }}
                                className="w-20 h-20 rounded-full bg-black border-4 border-[#1DB954] flex items-center justify-center shadow-[0_0_50px_#1DB954] relative"
                            >
                                <div className="absolute inset-2 rounded-full border border-[#1DB954]/30" />
                                <div className="w-3 h-3 rounded-full bg-white" />
                                <Check size={32} className="text-[#1DB954] absolute" />
                            </motion.div>
                            <h3 className="font-display text-3xl text-white">Tune Added!</h3>
                            <p className="font-sans text-white/50">Great choice for the {EVENTS.find(e => e.id === selectedEvent)?.label}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-6 md:px-12 relative z-10">

                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <span className="font-sans text-[9px] md:text-[10px] tracking-[0.5em] md:tracking-[0.6em] uppercase text-[#1DB954] block mb-3 md:mb-4">Guest DJ</span>
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-white mb-4 md:mb-6">Sonic Library</h2>

                    {/* Aesthetic Description */}
                    <p className="font-serif italic text-white/50 text-sm md:text-base max-w-md mx-auto leading-relaxed">
                        Curate the soundtrack to our celebration. <br className="hidden md:block" />
                        <span className="text-white/70">Search, suggest & vote</span> for your favorite tracks.
                    </p>

                    {/* Event Selector */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6 md:mt-8">
                        {EVENTS.map((event) => (
                            <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event.id)}
                                className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full border transition-all duration-300 min-h-[44px] ${selectedEvent === event.id
                                    ? 'bg-white/10 border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent border-white/5 text-white/40 hover:bg-white/5 hover:text-white/70'
                                    }`}
                            >
                                <span style={{ color: selectedEvent === event.id ? event.color : 'currentColor' }}>{event.icon}</span>
                                <span className="font-sans text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase">{event.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 max-w-6xl mx-auto">

                    {/* Left: Instant Search */}
                    <div className="flex flex-col gap-6 md:gap-8">
                        <div className="relative group">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Suggest a song for ${EVENTS.find(e => e.id === selectedEvent)?.label}...`}
                                className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 md:py-4 pl-12 md:pl-14 pr-5 md:pr-6 text-sm md:text-base text-white font-sans placeholder:text-white/30 focus:outline-none focus:border-[#1DB954]/50 focus:bg-white/10 transition-all min-h-[44px]"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                            <button
                                onClick={() => query && performSearch(query)}
                                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#1DB954] transition-colors hover:text-[#1DB954]"
                            >
                                <Search size={20} />
                            </button>
                            {isSearching && (
                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                    <Loader2 size={16} className="animate-spin text-[#1DB954]" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar min-h-[100px]" role="region" aria-live="polite" aria-atomic="false">
                            {results.length > 0 && <span className="sr-only">{results.length} tracks found</span>}
                            <AnimatePresence mode="popLayout">
                                {results.map((track) => (
                                    <motion.div
                                        key={track.trackId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all overflow-hidden"
                                    >
                                        {/* Vinyl Animation Container */}
                                        <div className="relative w-16 h-16 flex-shrink-0 perspective-1000">
                                            {/* The Disc (Behind) */}
                                            <motion.div
                                                className="absolute inset-0 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-xl"
                                                initial={{ x: 0, rotate: 0 }}
                                                whileHover={{ x: 24, rotate: 360 }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            >
                                                {/* Vinyl Grooves */}
                                                <div className="absolute inset-0 rounded-full border border-white/5 opacity-50" style={{ margin: '2px' }} />
                                                <div className="absolute inset-0 rounded-full border border-white/5 opacity-50" style={{ margin: '4px' }} />
                                                <div className="absolute inset-0 rounded-full border border-white/5 opacity-50" style={{ margin: '6px' }} />

                                                {/* Center Label */}
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/20" />
                                            </motion.div>

                                            {/* The Sleeve (Front) */}
                                            <div className="relative z-10 w-16 h-16 rounded-lg shadow-2xl overflow-hidden bg-zinc-900">
                                                <img
                                                    src={track.artworkUrl100}
                                                    alt={track.trackName}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Glossy Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 z-10">
                                            <h4 className="font-display text-lg text-white truncate group-hover:text-[#1DB954] transition-colors">
                                                {track.trackName}
                                            </h4>
                                            <p className="font-sans text-xs text-white/50 truncate flex items-center gap-2">
                                                {track.artistName}
                                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                                {track.collectionName}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleAdd(track)}
                                            disabled={addedTracks.has(track.trackId)}
                                            className={`relative z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${addedTracks.has(track.trackId)
                                                ? 'bg-[#1DB954] text-black scale-110 shadow-[0_0_20px_#1DB954]'
                                                : 'bg-white/10 text-white hover:bg-white/20 hover:scale-110'
                                                }`}
                                        >
                                            {addedTracks.has(track.trackId) ? <Check size={18} /> : <Plus size={18} />}
                                        </button>

                                        {/* Added State - Glassmorphic Overlay */}
                                        {addedTracks.has(track.trackId) && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 z-0 bg-black/40 backdrop-blur-[2px] pointer-events-none"
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {results.length === 0 && query && !isSearching && !error && (
                                <div className="text-center py-12 text-white/30 font-sans text-xs uppercase tracking-widest">
                                    No tracks found
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-12 text-red-400/80 font-sans text-xs uppercase tracking-widest">
                                    {error}
                                </div>
                            )}

                            {!query && (
                                <div className="text-center py-12 text-white/10 font-serif italic">
                                    Start typing to search...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Top Ranked Leaderboard */}
                    <div className="relative">
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent rounded-3xl border border-white/10 pointer-events-none transition-colors duration-500"
                            style={{ borderColor: `${activeColor}20`, background: `linear-gradient(to bottom, ${activeColor}10, transparent)` }}
                        />

                        <div className="relative p-8 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <Trophy className="animate-pulse" size={24} style={{ color: activeColor }} />
                                <h3 className="font-display text-2xl text-white">Top Requests</h3>
                            </div>

                            <div className="flex flex-col gap-4">
                                <AnimatePresence mode="popLayout">
                                    {topRequests.map((req, i) => (
                                        <motion.div
                                            key={req.id}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5"
                                        >
                                            <div className="flex flex-col items-center justify-center w-8">
                                                <span className="font-display text-xl" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)' }}>
                                                    #{i + 1}
                                                </span>
                                            </div>

                                            <img
                                                src={req.album_art}
                                                alt={req.track_name}
                                                className="w-12 h-12 rounded-full object-cover border border-white/10"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <span className="font-display text-lg text-white/90 block truncate">{req.track_name}</span>
                                                <span className="font-sans text-[10px] uppercase tracking-wider text-white/40 block truncate">{req.artist_name}</span>
                                            </div>

                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="font-mono text-xs text-white/70">{req.vote_count}</span>
                                                <Flame size={12} className="text-[#FF4500]" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {topRequests.length === 0 && (
                                    <div className="text-white/30 font-serif italic text-center py-12">
                                        Be the first to vote for the {EVENTS.find(e => e.id === selectedEvent)?.label}!
                                    </div>
                                )}

                                {/* View All Button */}
                                {topRequests.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={async () => {
                                            // Fetch all requests for this event
                                            const { data } = await supabase
                                                .from('song_requests')
                                                .select('*')
                                                .eq('client_id', WEDDING_CLIENT_ID)
                                                .eq('event_id', selectedEvent)
                                                .order('vote_count', { ascending: false });
                                            if (data) setAllRequests(data);
                                            setShowAllModal(true);
                                        }}
                                        className="w-full mt-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 font-sans text-xs tracking-widest uppercase hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        <span>View All Requests</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* View All Requests Modal */}
            <AnimatePresence>
                {showAllModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                        onClick={() => setShowAllModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Trophy size={20} style={{ color: activeColor }} />
                                    <h3 className="font-display text-xl text-white">All Requests</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 font-mono text-xs text-white/50">
                                        {allRequests.length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAllModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            {/* Scrollable List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {allRequests.map((req, i) => (
                                    <motion.div
                                        key={req.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex flex-col items-center justify-center w-8">
                                            <span
                                                className="font-display text-lg"
                                                style={{
                                                    color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)'
                                                }}
                                            >
                                                #{i + 1}
                                            </span>
                                        </div>

                                        <img
                                            src={req.album_art}
                                            alt={req.track_name}
                                            className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <span className="font-display text-base text-white/90 block truncate">{req.track_name}</span>
                                            <span className="font-sans text-[10px] uppercase tracking-wider text-white/40 block truncate">{req.artist_name}</span>
                                        </div>

                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                            <span className="font-mono text-xs text-white/70">{req.vote_count}</span>
                                            <Flame size={10} className="text-[#FF4500]" />
                                        </div>
                                    </motion.div>
                                ))}

                                {allRequests.length === 0 && (
                                    <div className="text-center py-12 text-white/30 font-serif italic">
                                        No requests yet for this event
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-white/10 text-center">
                                <span className="font-sans text-[10px] uppercase tracking-widest text-white/30">
                                    {EVENTS.find(e => e.id === selectedEvent)?.label} Playlist
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
