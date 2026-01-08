import React, { useEffect, useState } from 'react';

function BookingsPage() {
  const [scope, setScope] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  async function fetchBookings(selectedScope) {
    try {
      const res = await fetch(`/api/bookings?scope=${selectedScope}`);
      const data = await res.json();
      setBookings(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load bookings');
    }
  }

  useEffect(() => {
    fetchBookings(scope);
  }, [scope]);

  async function cancelBooking(id) {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      fetchBookings(scope);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <div className="card-header flex-between">
        <div>
          <h2>Bookings</h2>
          <p className="card-subtitle">View upcoming and past meetings.</p>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={scope === 'upcoming' ? 'tab active' : 'tab'}
            onClick={() => setScope('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={scope === 'past' ? 'tab active' : 'tab'}
            onClick={() => setScope('past')}
          >
            Past
          </button>
        </div>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}
        <ul className="list">
          {bookings.map((b) => (
            <li key={b.id} className="list-item">
              <div>
                <div className="item-title">{b.event_title}</div>
                <div className="item-subtitle">
                  {new Date(b.start_time).toLocaleString()} · {b.booker_name} ({b.booker_email})
                </div>
              </div>
              {scope === 'upcoming' && (
                <div className="item-actions">
                  <button type="button" className="danger" onClick={() => cancelBooking(b.id)}>
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
          {!bookings.length && <li>No bookings.</li>}
        </ul>
      </div>
    </div>
  );
}

export default BookingsPage;
