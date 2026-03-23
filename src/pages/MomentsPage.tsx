import React, { useEffect, useCallback } from 'react';
import { MomentsAuthProvider, useMomentsAuth } from '../lib/moments/auth-context';
import { useMomentsStore } from '../lib/moments/store';
import { PhoneLogin } from '../../components/moments/PhoneLogin';
import { MomentsEventSelector } from '../../components/moments/EventSelector';
import { EventGallery } from '../../components/moments/EventGallery';

function MomentsContent() {
  const { user, loading, guestName } = useMomentsAuth();
  const { currentView, setView, lightboxOpen, closeLightbox, selectedEvent, setSelectedEvent, resetGallery } = useMomentsStore();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setView('login');
    } else if (!guestName) {
      setView('login');
    } else if (currentView === 'login') {
      setView('events');
    }
  }, [user, loading, guestName]);

  // Push history state when navigating within Moments so browser back stays inside /moments
  useEffect(() => {
    if (currentView !== 'login') {
      window.history.pushState({ momentsView: currentView }, '');
    }
  }, [currentView]);

  // Trap browser back button within Moments
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If lightbox is open, close it first
      if (useMomentsStore.getState().lightboxOpen) {
        e.preventDefault();
        closeLightbox();
        window.history.pushState({ momentsView: 'gallery' }, '');
        return;
      }

      const view = useMomentsStore.getState().currentView;
      if (view === 'gallery') {
        e.preventDefault();
        setSelectedEvent(null);
        resetGallery();
        setView('events');
        window.history.pushState({ momentsView: 'events' }, '');
      } else if (view === 'events') {
        // Stay on moments — push state back
        e.preventDefault();
        window.history.pushState({ momentsView: 'events' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="w-5 h-5 border border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {currentView === 'login' && <PhoneLogin />}
      {currentView === 'events' && <MomentsEventSelector />}
      {currentView === 'gallery' && <EventGallery />}
    </div>
  );
}

export function MomentsPage() {
  return (
    <MomentsAuthProvider>
      <MomentsContent />
    </MomentsAuthProvider>
  );
}
