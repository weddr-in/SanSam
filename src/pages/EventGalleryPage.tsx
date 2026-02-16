import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Loader2, X, Heart, Upload, Maximize2, Download, Trash2 } from 'lucide-react';

interface MediaItem {
    id: number;
    file_url: string;
    caption: string;
    mime_type: string;
    created_at: string;
    user_id: string;
}

export const EventGalleryPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { scrollY } = useScroll();

    // Parallax & Header Animations
    const headerBg = useTransform(scrollY, [0, 100], ['rgba(5,5,5,0)', 'rgba(5,5,5,0.6)']);
    const headerBackdrop = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(20px)']);
    const headerY = useTransform(scrollY, [0, 100], [0, -10]);

    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

    // Batch Upload State
    const [previewFiles, setPreviewFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [sortMode, setSortMode] = useState<'cinematic' | 'user' | 'date'>('cinematic');

    const eventTitle = eventId ? eventId.charAt(0).toUpperCase() + eventId.slice(1) : 'Gallery';

    const sortedMedia = React.useMemo(() => {
        const items = [...media];
        switch (sortMode) {
            case 'date':
                return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            case 'user':
                return items.sort((a, b) => a.user_id.localeCompare(b.user_id));
            case 'cinematic':
            default:
                // Default is newest first (as fetched)
                return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    }, [media, sortMode]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/moments');
            setSession(session);
        });
        fetchMedia();
    }, [eventId, navigate]);

    const fetchMedia = async () => {
        if (!eventId) return;
        const { data, error } = await supabase
            .from('media_uploads')
            .select('*')
            .eq('event_id', eventId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (!error && data) setMedia(data);
        setLoading(false);
    };

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(Array.from(e.target.files));
        }
    };

    const handleFileSelect = (files: File[]) => {
        if (files.length > 20) {
            alert("Please select up to 20 files only.");
            return;
        }
        setPreviewFiles(files);
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
    };

    const removeFile = (index: number) => {
        const newFiles = [...previewFiles];
        const newUrls = [...previewUrls];
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
        setPreviewFiles(newFiles);
        setPreviewUrls(newUrls);
    };

    const confirmUpload = async () => {
        if (previewFiles.length === 0) return;
        if (!session || !eventId) return;

        setUploading(true);

        try {
            // Upload all files in parallel
            await Promise.all(previewFiles.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${eventId}/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('moments').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('moments').getPublicUrl(filePath);

                const { error: dbError } = await supabase.from('media_uploads').insert({
                    user_id: session.user.id,
                    event_id: eventId,
                    file_url: publicUrl,
                    mime_type: file.type,
                    caption: '',
                });

                if (dbError) throw dbError;
            }));

            // Cleanup and refresh
            setPreviewFiles([]);
            setPreviewUrls([]);
            fetchMedia();
        } catch (error: any) {
            alert('Error uploading: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const cancelUpload = () => {
        setPreviewFiles([]);
        setPreviewUrls([]);
    };

    const handleDelete = async (item: MediaItem) => {
        if (!confirm("Are you sure you want to delete this memory? This cannot be undone.")) return;

        try {
            // 1. Delete from Storage
            const filePath = item.file_url.split('/moments/')[1]; // Extract path after bucket name
            if (filePath) {
                const { error: storageError } = await supabase.storage.from('moments').remove([filePath]);
                if (storageError) console.error('Storage delete error:', storageError);
            }

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from('media_uploads')
                .delete()
                .eq('id', item.id);

            if (dbError) throw dbError;

            // 3. Update UI
            setMedia(media.filter(m => m.id !== item.id));
            if (lightboxItem?.id === item.id) setLightboxItem(null);

        } catch (error: any) {
            alert('Error deleting: ' + error.message);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-serif italic">Loading Gallery...</div>;



    // ... (rest of the component)

    return (
        <main
            className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 relative"
            onDragOver={handleDragOver}
        >
            {/* ... (existing overlays) ... */}

            {/* Sticky Header */}
            <motion.header
                style={{ backgroundColor: headerBg, backdropFilter: headerBackdrop, y: headerY }}
                className="sticky top-0 z-40 px-8 py-8 flex justify-between items-center transition-all duration-500"
            >
                <div className="flex items-center gap-8">
                    <button onClick={() => navigate('/moments')} className="group flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-50 transition-opacity">
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                            <ArrowLeft size={12} />
                        </div>
                        <span className="hidden md:inline">Back</span>
                    </button>
                    <div className="h-8 w-[1px] bg-white/10" />
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Shared Gallery</span>
                        <h1 className="font-display text-3xl leading-none tracking-tight">{eventTitle}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Sort Controls */}
                    <div className="hidden md:flex bg-white/5 rounded-full p-1 border border-white/10">
                        {(['cinematic', 'user', 'date'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setSortMode(mode)}
                                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${sortMode === mode ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div className="text-right hidden md:block">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Memories</span>
                        <span className="font-display text-xl">{media.length}</span>
                    </div>
                </div>
            </motion.header>

            {/* Gallery Grid - "The Living Wall" */}
            <div className="px-4 md:px-8 max-w-[2000px] mx-auto pb-32">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">

                    {/* Upload Card (Always First) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors duration-500 aspect-[3/4] flex flex-col items-center justify-center text-center p-6"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleFileInput}
                        />
                        <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:bg-white group-hover:text-black">
                            <Plus size={32} strokeWidth={1} />
                        </div>
                        <h3 className="font-display text-2xl mb-2">Add Memories</h3>
                        <p className="text-xs uppercase tracking-widest text-white/40">
                            Batch upload supported
                        </p>
                    </motion.div>

                    {/* Media Items */}
                    {sortedMedia.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layoutId={`media-${item.id}`}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            onClick={() => setLightboxItem(item)}
                            className="break-inside-avoid relative group cursor-zoom-in overflow-hidden rounded-xl bg-white/5 mb-4"
                        >
                            {item.mime_type.startsWith('video') ? (
                                <video src={item.file_url} className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                            ) : (
                                <img
                                    src={item.file_url}
                                    alt="Memory"
                                    className="w-full h-auto object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105 opacity-80 group-hover:opacity-100 grayscale group-hover:grayscale-0"
                                    loading="lazy"
                                />
                            )}

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <div className="flex justify-between items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                    <button className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white hover:text-black transition-all">
                                        <Heart size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Batch Upload Preview Modal */}
            <AnimatePresence>
                {previewUrls.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                    >
                        <div className="max-w-4xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50 backdrop-blur-md z-10">
                                <div>
                                    <h3 className="font-display text-2xl">Upload Memories</h3>
                                    <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
                                        {previewUrls.length} items selected
                                    </p>
                                </div>
                                <button onClick={cancelUpload} className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Grid Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {previewUrls.map((url, index) => (
                                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5">
                                            {previewFiles[index].type.startsWith('video') ? (
                                                <video src={url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                            )}

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-full text-white/70 hover:text-red-400 hover:bg-black transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add More Button */}
                                    {previewUrls.length < 20 && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/30 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all"
                                        >
                                            <Plus size={24} className="mb-2" />
                                            <span className="text-[10px] uppercase tracking-widest">Add More</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 bg-black/50 backdrop-blur-md z-10">
                                <div className="flex gap-4">
                                    <button
                                        onClick={cancelUpload}
                                        className="flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white/40 hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmUpload}
                                        disabled={uploading}
                                        className="flex-[2] bg-white text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <span>Upload {previewUrls.length} Memories</span>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cinematic Lightbox */}
            <AnimatePresence>
                {lightboxItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4"
                        onClick={() => setLightboxItem(null)}
                    >
                        {/* Controls */}
                        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 pointer-events-auto">
                                {new Date(lightboxItem.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex gap-4 pointer-events-auto">
                                {session?.user?.id === lightboxItem.user_id && (
                                    <button
                                        onClick={() => handleDelete(lightboxItem)}
                                        className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                        title="Delete Memory"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                                    <Download size={20} />
                                </button>
                                <button
                                    onClick={() => setLightboxItem(null)}
                                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <motion.div
                            layoutId={`media-${lightboxItem.id}`}
                            className="relative max-w-7xl max-h-[85vh] w-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {lightboxItem.mime_type.startsWith('video') ? (
                                <video src={lightboxItem.file_url} controls autoPlay className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm" />
                            ) : (
                                <img src={lightboxItem.file_url} alt="Full View" className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm" />
                            )}
                        </motion.div>

                        {/* Caption/Footer */}
                        <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none">
                            <p className="font-display text-2xl text-white/80 tracking-wide">
                                {lightboxItem.caption || "Untitled Memory"}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </main>
    );
};
