import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Modal from './Modal';

const EMPTY_FORM = {
  isActive: true,
  type: 'Cultural Event',
  location: '',
  club: '',
  clubTagline: '',
  clubPosterUrl: '',
  category: '',
  tags: '',
  event: '',
  sport: '',
  tagline: '',
  format: '',
  description: '',
  startDate: '',
  endDate: '',
  venue: '',
  teamSizeMin: 1,
  teamSizeMax: 1,
  posterUrl: '',
  rulebookUrl: '',
  registrationUrl: '',
  registrationOpen: false,
  coordinator: '',
  coCoordinator: '',
  contactMain: '',
  contactSub: '',
  scheduleTime: '',
};

const TYPE_OPTIONS = ['Cultural Event', 'Sports Event'];

export default function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [sports, cultural] = await Promise.all([
        api.get('/events/sports').catch(() => ({ data: [] })),
        api.get('/events/cultural').catch(() => ({ data: [] })),
      ]);
      const all = [
        ...(Array.isArray(sports.data) ? sports.data : sports.data?.data || []),
        ...(Array.isArray(cultural.data) ? cultural.data : cultural.data?.data || []),
      ];
      // Deduplicate by _id
      const seen = new Set();
      setEvents(all.filter(e => seen.has(e._id) ? false : seen.add(e._id)));
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (evt) => {
    setEditing(evt._id);
    setForm({
      isActive: evt.isActive ?? true,
      type: evt.type || 'Cultural Event',
      location: evt.location || '',
      club: evt.club || '',
      clubTagline: evt.clubTagline || '',
      clubPosterUrl: evt.clubPosterUrl || '',
      category: evt.category || '',
      tags: (evt.tags || []).join(', '),
      event: evt.event || '',
      sport: evt.sport || '',
      tagline: evt.tagline || '',
      format: (evt.format || []).join(', '),
      description: evt.description || '',
      startDate: evt.startDate || '',
      endDate: evt.endDate || '',
      venue: evt.venue || '',
      teamSizeMin: evt.teamSize?.min ?? 1,
      teamSizeMax: evt.teamSize?.max ?? 1,
      posterUrl: evt.posterUrl || '',
      rulebookUrl: evt.rulebookUrl || '',
      registrationUrl: evt.registrationUrl || '',
      registrationOpen: !!evt.registrationOpen,
      coordinator: (evt.coordinator || []).join(', '),
      coCoordinator: (evt.coCoordinator || []).join(', '),
      contactMain: (evt.contactMain || []).join(', '),
      contactSub: (evt.contactSub || []).join(', '),
      scheduleTime: evt.schedule?.time || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: inputType === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.type || !form.description || !form.startDate || !form.endDate || !form.location) {
      return toast.error('Type, description, start date, end date, and location are required');
    }

    if (form.type === 'Cultural Event') {
      if (!form.event || !form.club) {
        return toast.error('Event Name and Club are required for Cultural Events');
      }
    } else if (form.type === 'Sports Event') {
      if (!form.sport) {
        return toast.error('Sport name is required for Sports Events');
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        isActive: form.isActive,
        type: form.type,
        location: form.location,
        club: form.type === 'Cultural Event' ? form.club : undefined,
        clubTagline: form.type === 'Cultural Event' ? form.clubTagline : undefined,
        clubPosterUrl: form.type === 'Cultural Event' ? form.clubPosterUrl : undefined,
        category: form.type === 'Cultural Event' ? form.category : undefined,
        tags: form.type === 'Cultural Event' ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        event: form.type === 'Cultural Event' ? form.event : undefined,
        sport: form.type === 'Sports Event' ? form.sport : undefined,
        tagline: form.type === 'Sports Event' ? form.tagline : undefined,
        format: form.type === 'Sports Event' ? form.format.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        venue: form.venue || undefined,
        teamSize: form.type === 'Cultural Event' ? {
          min: Number(form.teamSizeMin) || 1,
          max: Number(form.teamSizeMax) || 1
        } : undefined,
        posterUrl: form.posterUrl || undefined,
        rulebookUrl: form.rulebookUrl || undefined,
        registrationUrl: form.registrationUrl || undefined,
        registrationOpen: form.registrationOpen,
        coordinator: form.coordinator.split(',').map(s => s.trim()).filter(Boolean),
        coCoordinator: form.coCoordinator.split(',').map(s => s.trim()).filter(Boolean),
        contactMain: form.contactMain.split(',').map(s => s.trim()).filter(Boolean),
        contactSub: form.contactSub.split(',').map(s => s.trim()).filter(Boolean),
        schedule: form.type === 'Cultural Event' && form.scheduleTime ? {
          time: form.scheduleTime
        } : undefined,
      };

      if (editing) {
        await api.put(`/events/${editing}`, payload);
        toast.success('Event updated');
      } else {
        await api.post('/events', payload);
        toast.success('Event created');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event and all its assets?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = events.filter(e => {
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    const name = e.event || e.sport || '';
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.club || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Events ({events.length})</h3>
        <div className="panel-actions">
          <input className="search-input" placeholder="Search events..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <select className="search-input" style={{ width: 160 }} value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Cultural Event">Cultural Events</option>
            <option value="Sports Event">Sports Events</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No events found</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Poster</th>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Registration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(evt => {
                const name = evt.event || evt.sport || 'Unnamed Event';
                const sub = evt.club || '';
                const poster = evt.clubPosterUrl || evt.posterUrl;
                return (
                  <tr key={evt._id}>
                    <td>
                      {poster ? (
                        <img src={poster} alt="Poster" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎪</div>
                      )}
                    </td>
                    <td>
                      <strong>{name}</strong>
                      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
                    </td>
                    <td>
                      <span className={`badge ${evt.type === 'Sports Event' ? 'badge-green' : 'badge-indigo'}`}>
                        {evt.type}
                      </span>
                    </td>
                    <td><span className="badge badge-outline">{evt.location}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {evt.startDate} to {evt.endDate}
                    </td>
                    <td>
                      <span className={`badge ${evt.registrationOpen ? 'badge-green' : 'badge-red'}`}>
                        {evt.registrationOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(evt)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(evt._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Event' : 'Create Event'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-grid">
              <div className="input-group">
                <label>Event Type *</label>
                <select name="type" value={form.type} onChange={handleChange}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Location *</label>
                <input name="location" value={form.location} onChange={handleChange}
                  placeholder="PATNA, BIHTA, or both" required />
              </div>
            </div>

            {/* Conditionally Render Fields based on Type */}
            {form.type === 'Cultural Event' ? (
              <>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Event Name *</label>
                    <input name="event" value={form.event} onChange={handleChange}
                      placeholder="E.g., Battle of Bands" required />
                  </div>
                  <div className="input-group">
                    <label>Club *</label>
                    <input name="club" value={form.club} onChange={handleChange}
                      placeholder="E.g., Music Club" required />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Club Tagline</label>
                    <input name="clubTagline" value={form.clubTagline} onChange={handleChange}
                      placeholder="E.g., Feel the Rhythm" />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <input name="category" value={form.category} onChange={handleChange}
                      placeholder="E.g., Music & Vocals" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Tags (comma-separated)</label>
                    <input name="tags" value={form.tags} onChange={handleChange}
                      placeholder="E.g., Rock, Vocal, Acoustic" />
                  </div>
                  <div className="input-group">
                    <label>Schedule Time</label>
                    <input name="scheduleTime" value={form.scheduleTime} onChange={handleChange}
                      placeholder="E.g., 2:00 PM - 5:00 PM" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Team Size Min</label>
                    <input type="number" name="teamSizeMin" value={form.teamSizeMin} onChange={handleChange} min={1} />
                  </div>
                  <div className="input-group">
                    <label>Team Size Max</label>
                    <input type="number" name="teamSizeMax" value={form.teamSizeMax} onChange={handleChange} min={1} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Club Poster URL</label>
                  <input name="clubPosterUrl" value={form.clubPosterUrl} onChange={handleChange}
                    placeholder="https://example.com/club-poster.png" />
                </div>
              </>
            ) : (
              <>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Sport Name *</label>
                    <input name="sport" value={form.sport} onChange={handleChange}
                      placeholder="E.g., Basketball" required />
                  </div>
                  <div className="input-group">
                    <label>Tagline</label>
                    <input name="tagline" value={form.tagline} onChange={handleChange}
                      placeholder="E.g., Rise and Conquer" />
                  </div>
                </div>
                <div className="input-group">
                  <label>Format (comma-separated stages)</label>
                  <input name="format" value={form.format} onChange={handleChange}
                    placeholder="E.g., Group Stage, Semis, Finals" />
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="form-grid">
              <div className="input-group">
                <label>Start Date *</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>End Date *</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="E.g., An exhilarating inter-college band competition to showcase the best musical talents..." rows={3} required />
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label>Venue</label>
                <input name="venue" value={form.venue} onChange={handleChange}
                  placeholder="E.g., Open Air Theatre (OAT) / Sports Complex" />
              </div>
              <div className="input-group">
                <label>Poster URL</label>
                <input name="posterUrl" value={form.posterUrl} onChange={handleChange}
                  placeholder="https://example.com/poster.png" />
              </div>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label>Rulebook URL</label>
                <input name="rulebookUrl" value={form.rulebookUrl} onChange={handleChange}
                  placeholder="https://example.com/rulebook.pdf" />
              </div>
              <div className="input-group">
                <label>Registration URL</label>
                <input name="registrationUrl" value={form.registrationUrl} onChange={handleChange}
                  placeholder="https://example.com/register" />
              </div>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label>Coordinator(s) (comma-separated)</label>
                <input name="coordinator" value={form.coordinator} onChange={handleChange}
                  placeholder="E.g., Rahul Kumar" />
              </div>
              <div className="input-group">
                <label>Co-Coordinator(s) (comma-separated)</label>
                <input name="coCoordinator" value={form.coCoordinator} onChange={handleChange}
                  placeholder="E.g., Priya Sharma" />
              </div>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label>Main Contact(s) (comma-separated)</label>
                <input name="contactMain" value={form.contactMain} onChange={handleChange}
                  placeholder="E.g., 9876xxxxxx" />
              </div>
              <div className="input-group">
                <label>Sub Contact(s) (comma-separated)</label>
                <input name="contactSub" value={form.contactSub} onChange={handleChange}
                  placeholder="E.g., 8765xxxxxx" />
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, alignItems: 'center' }}>
              <label className="checkbox-label" style={{ margin: 0 }}>
                <input type="checkbox" name="registrationOpen" checked={form.registrationOpen} onChange={handleChange} />
                Registration Open
              </label>
              <label className="checkbox-label" style={{ margin: 0 }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Is Active
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
