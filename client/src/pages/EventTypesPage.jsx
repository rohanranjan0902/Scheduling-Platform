import React, { useEffect, useState } from 'react';

function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [form, setForm] = useState({ id: null, title: '', description: '', duration_minutes: 30, slug: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchEventTypes() {
    try {
      const res = await fetch('/api/event-types');
      const data = await res.json();
      setEventTypes(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load event types');
    }
  }

  useEffect(() => {
    fetchEventTypes();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'duration_minutes' ? Number(value) : value }));
  }

  function handleEdit(et) {
    setForm({
      id: et.id,
      title: et.title,
      description: et.description || '',
      duration_minutes: et.duration_minutes,
      slug: et.slug
    });
  }

  function resetForm() {
    setForm({ id: null, title: '', description: '', duration_minutes: 30, slug: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        duration_minutes: form.duration_minutes,
        slug: form.slug
      };
      let res;
      if (form.id) {
        res = await fetch(`/api/event-types/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/event-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }
      await fetchEventTypes();
      resetForm();
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event type?')) return;
    try {
      const res = await fetch(`/api/event-types/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchEventTypes();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Event Types</h2>
        <p className="card-subtitle">Create and manage your booking links.</p>
      </div>
      <div className="card-body two-column">
        <div>
          <h3>{form.id ? 'Edit event type' : 'New event type'}</h3>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Title
              <input name="title" value={form.title} onChange={handleChange} required />
            </label>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} />
            </label>
            <label>
              Duration (minutes)
              <input
                type="number"
                name="duration_minutes"
                min="5"
                step="5"
                value={form.duration_minutes}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              URL Slug
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                placeholder="e.g. 30min"
              />
            </label>
            {error && <div className="error-text">{error}</div>}
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              {form.id && (
                <button type="button" className="secondary" onClick={resetForm}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
        <div>
          <h3>Your event types</h3>
          <ul className="list">
            {eventTypes.map((et) => (
              <li key={et.id} className="list-item">
                <div>
                  <div className="item-title">{et.title}</div>
                  <div className="item-subtitle">
                    {et.duration_minutes} min · /{et.slug}
                  </div>
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => handleEdit(et)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(et.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {!eventTypes.length && <li>No event types yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EventTypesPage;
