import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import EventTypesPage from './pages/EventTypesPage.jsx';
import AvailabilityPage from './pages/AvailabilityPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import PublicEventPage from './pages/PublicEventPage.jsx';
import BookingConfirmationPage from './pages/BookingConfirmationPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/event-types" replace />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route path="event-types" element={<EventTypesPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="bookings" element={<BookingsPage />} />
      </Route>
      <Route path=":slug" element={<PublicEventPage />} />
      <Route path=":slug/confirm/:bookingId" element={<BookingConfirmationPage />} />
    </Routes>
  );
}

export default App;
