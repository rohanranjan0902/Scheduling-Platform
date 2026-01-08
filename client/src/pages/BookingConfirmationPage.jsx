import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bookings?scope=upcoming');
        const data = await res.json();
        const found = data.find((b) => String(b.id) === String(bookingId));
        if (found) setBooking(found);
      } catch (e) {
        console.error(e);
        setError('Failed to load booking');
      }
    }
    load();
  }, [bookingId]);

  if (error) {
    return <div className="public-layout"><p>{error}</p></div>;
  }

  if (!booking) {
    return <div className="public-layout"><p>Loading booking...</p></div>;
  }

  return (
    <div className="public-layout">
      <div className="public-card">
        <h1>Booking confirmed</h1>
        <p>
          You are booked for <strong>{booking.event_title}</strong> with
          {' '}
          {booking.booker_name} on {new Date(booking.start_time).toLocaleString()}.
        </p>
      </div>
    </div>
  );
}

export default BookingConfirmationPage;
