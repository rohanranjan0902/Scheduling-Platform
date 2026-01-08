import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function PublicEventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventType, setEventType] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [timezone, setTimezone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEventType() {
      try {
        const res = await fetch(`/api/public/${slug}`);
        if (!res.ok) {
          throw new Error('Event type not found');
        }
        const data = await res.json();
        setEventType(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    }
    loadEventType();
  }, [slug]);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch(`/api/public/${slug}/availability?date=${date}`);
        const data = await res.json();
        setSlots(data.slots || []);
        setTimezone(data.timezone || '');
      } catch (e) {
        console.error(e);
        setError('Failed to load availability');
      }
    }
    loadSlots();
  }, [slug, date]);

  async function handleBook(e) {
    e.preventDefault();
    if (!selectedSlot) return;
    setError('');
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: selectedSlot.start, name, email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to book');
      }
      const booking = await res.json();
      navigate(`/${slug}/confirm/${booking.id}`);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  return (
    <div className="public-layout">
      <div className="public-card">
        {eventType ? (
          <div className="public-event-header">
            <h1>{eventType.title}</h1>
            <p>{eventType.description}</p>
            {timezone && <p className="timezone">Times shown in {timezone}</p>}
          </div>
        ) : (
          <p>Loading event...</p>
        )}
        <div className="public-body">
          <div className="date-picker">
            <h3>Select a date</h3>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="hint">Calendar-style picker similar to Cal.com.</p>
          </div>
          <div className="slot-picker">
            <h3>Select a time</h3>
            <div className="slots-grid">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  className={selectedSlot?.start === slot.start ? 'slot active' : 'slot'}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
              {!slots.length && <p>No available times.</p>}
            </div>
            {selectedSlot && (
              <form className="booking-form" onSubmit={handleBook}>
                <h3>Enter your details</h3>
                <label>
                  Name
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                {error && <div className="error-text">{error}</div>}
                <button type="submit">Confirm booking</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicEventPage;
