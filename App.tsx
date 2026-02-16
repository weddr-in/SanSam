import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './src/pages/Home';
import { EventGalleryPage } from './src/pages/EventGalleryPage';
import { RSVPPage } from './src/pages/RSVPPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsvp" element={<RSVPPage />} />
        <Route path="/gallery" element={<EventGalleryPage />} />
      </Routes>
    </Router>
  );
}
