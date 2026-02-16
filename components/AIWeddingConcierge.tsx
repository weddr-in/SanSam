import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Image as ImageIcon,
} from 'lucide-react';
import { sendMessage } from '../src/services/aiConcierge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface AIWeddingConciergeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIWeddingConcierge: React.FC<AIWeddingConciergeProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! Sanjana and Samartha are busy planning the wedding, so I'm here to help you with anything you need.\n\nAsk me about events, venues, dress codes, or upload an outfit photo for feedback!",
      timestamp: new Date(),
    },
  ]);

  // Parse message content - remove markdown **, convert links to clickable
  const parseMessage = (content: string) => {
    // Remove markdown bold markers
    let parsed = content.replace(/\*\*([^*]+)\*\*/g, '$1');
    // Remove markdown italic markers
    parsed = parsed.replace(/\*([^*]+)\*/g, '$1');
    return parsed;
  };

  // Render message with clickable links
  const renderMessageContent = (content: string) => {
    const parsed = parseMessage(content);
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = parsed.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        // Reset regex lastIndex
        urlRegex.lastIndex = 0;
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part.length > 40 ? part.substring(0, 40) + '...' : part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 4 * 1024 * 1024) {
        alert('Image size should be less than 4MB.');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || '(Image)',
      imageUrl: imagePreview || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    removeImage();
    setIsLoading(true);

    try {
      const response = await sendMessage(currentInput, messages, currentImage || undefined);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : "Connection issue. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:justify-end p-0 md:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Chat Container - Enhanced Mobile Design */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              // Swipe down to close on mobile
              if (info.offset.y > 150) {
                onClose();
              }
            }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full md:w-[420px] h-[92vh] md:h-[80vh] md:max-h-[700px] bg-[#0a0a0a] rounded-t-3xl md:rounded-2xl border-t md:border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Enhanced Header for Mobile */}
            <div className="px-4 sm:px-6 pt-3 pb-4 sm:py-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
              {/* Drag Handle - Mobile Only */}
              <div className="flex justify-center mb-3 md:hidden">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-base md:text-sm">💬</span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg md:text-base text-white/95">Concierge</h3>
                    <p className="font-mono text-[10px] md:text-[9px] text-white/40 uppercase tracking-widest mt-0.5">AI Assistant</p>
                  </div>
                </div>

                {/* Enhanced Close Button - Larger on Mobile */}
                <button
                  onClick={onClose}
                  className="w-11 h-11 md:w-8 md:h-8 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 group shadow-lg"
                  aria-label="Close chat"
                >
                  <X size={20} className="md:w-4 md:h-4 text-white/70 group-hover:text-white/90" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Messages Area - Enhanced Mobile Design */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 space-y-3 sm:space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Uploaded"
                        className="w-full rounded-xl sm:rounded-lg mb-2 sm:mb-3 border border-white/10"
                      />
                    )}
                    <div className={`inline-block px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-xl ${message.role === 'user'
                      ? 'bg-white/10 backdrop-blur-sm border border-white/20'
                      : 'bg-white/5 border border-white/10'
                      }`}>
                      <p className={`text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user'
                        ? 'text-white/95'
                        : 'text-white/80'
                        }`}>
                        {message.role === 'user' ? message.content : renderMessageContent(message.content)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Example Prompts - Mobile Optimized */}
            {messages.length === 1 && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-4">
                <p className="text-[11px] md:text-[10px] text-white/40 uppercase tracking-wider mb-3 text-center font-medium">Try asking...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "What should I wear?",
                    "Venue directions?",
                    "Event schedule?",
                    "Hotels nearby?",
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(handleSend, 100);
                      }}
                      className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-[13px] md:text-xs text-white/70 hover:text-white/90 transition-all duration-200 text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Preview - Enhanced */}
            {imagePreview && (
              <div className="px-4 sm:px-6 pb-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 sm:h-16 rounded-lg border border-white/20"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-7 h-7 md:w-6 md:h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95"
                    aria-label="Remove image"
                  >
                    <X size={14} className="text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Input Area for Mobile with Safe Area */}
            <div className="px-4 sm:px-6 pb-safe pb-6 sm:pb-6 pt-4 border-t border-white/5 bg-[#0a0a0a]">
              <div className="flex items-end gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Image Button - 44px touch target */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 flex items-center justify-center transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                  aria-label="Attach image"
                >
                  <ImageIcon size={20} className="text-white/50" strokeWidth={1.5} />
                </button>

                <div className="flex-1">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="w-full min-h-[44px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[15px] md:text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all duration-200 disabled:opacity-50"
                  />
                </div>

                {/* Send Button - 44px touch target */}
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 md:w-10 md:h-10 rounded-xl bg-white hover:bg-white/90 active:scale-95 disabled:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-lg shadow-white/10"
                  aria-label="Send message"
                >
                  <Send size={20} className={isLoading || (!input.trim() && !selectedImage) ? 'text-white/30' : 'text-black'} strokeWidth={2} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
