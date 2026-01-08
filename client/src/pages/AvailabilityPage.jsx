import React, { useEffect, useState } from 'react';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

function AvailabilityPage() {
  const [timezone, setTimezone] = useState('UTC');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/availability');
        const data = await res.json();
        setTimezone(data.timezone || 'UTC');
        setRules(data.rules || []);
      } catch (e) {
        console.error(e);
        setError('Failed to load availability');
      }
    }
    load();
  }, []);

  function updateRule(dayIndex, field, value) {
    setRules((prev) => {
      const existing = prev.find((r) => r.day_of_week === dayIndex);
      if (!existing) {
        return [
          ...prev,
          {
            day_of_week: dayIndex,
            start_time: field === 'start_time' ? value : '09:00',
            end_time: field === 'end_time' ? value : '17:00'
          }
        ];
      }
      return prev.map((r) =>
        r.day_of_week === dayIndex
          ? {
              ...r,
              [field]: value
            }
          : r
      );
    });
  }

  function toggleDay(dayIndex) {
    setRules((prev) => {
      const exists = prev.find((r) => r.day_of_week === dayIndex);
      if (exists) {
        return prev.filter((r) => r.day_of_week !== dayIndex);
      }
      return [
        ...prev,
        { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }
      ];
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/availability/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, rules })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function isDayEnabled(idx) {
    return rules.some((r) => r.day_of_week === idx);
  }

  function getRule(idx) {
    return rules.find((r) => r.day_of_week === idx) || { start_time: '09:00', end_time: '17:00' };
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Availability</h2>
        <p className="card-subtitle">Set when people can book time with you.</p>
      </div>
      <form className="card-body" onSubmit={handleSave}>
        <label className="field-inline">
          Timezone
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </label>
        <div className="availability-grid">
          {DAYS.map((day, idx) => {
            const enabled = isDayEnabled(idx);
            const rule = getRule(idx);
            return (
              <div key={day} className={enabled ? 'day-row enabled' : 'day-row'}>
                <label>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(idx)}
                  />
                  {day}
                </label>
                {enabled && (
                  <div className="time-range">
                    <input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) => updateRule(idx, 'start_time', e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) => updateRule(idx, 'end_time', e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save availability'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AvailabilityPage;
