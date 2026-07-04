import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Modal from './Modal';

const EMPTY = { event_name: '', campus: 'Patna', is_live: false, winner: '', team_names: '', score: '' };

export default function SportsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/sports');
      setItems(data.data || []);
    } catch {
      toast.error('Failed to load scorecards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item._id);
    setForm({
      event_name: item.event_name || '',
      campus: item.campus || 'Patna',
      is_live: !!item.is_live,
      winner: item.winner || '',
      team_names: (item.team_names || []).join(', '),
      score: (item.score || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const teams = form.team_names.split(',').map(s => s.trim()).filter(Boolean);
    const scores = form.score.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (teams.length !== scores.length) {
      return toast.error('Team count must match score count');
    }
    setSubmitting(true);
    try {
      const payload = {
        event_name: form.event_name,
        campus: form.campus,
        is_live: form.is_live,
        winner: form.winner || null,
        team_names: teams,
        score: scores,
      };
      if (editing) {
        await api.put(`/sports/${editing}`, payload);
        toast.success('Scorecard updated');
      } else {
        await api.post('/sports', payload);
        toast.success('Scorecard created');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scorecard?')) return;
    try {
      await api.delete(`/sports/${id}`);
      toast.success('Deleted');
      fetchItems();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = items.filter(i => {
    if (filter === 'live') return i.is_live;
    if (filter === 'completed') return !i.is_live;
    return true;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Sports Scorecards ({items.length})</h3>
        <div className="panel-actions">
          <select className="search-input" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Matches</option>
            <option value="live">🔴 Live</option>
            <option value="completed">✅ Completed</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Scorecard</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No scorecards found</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th><th>Campus</th><th>Status</th><th>Teams & Scores</th><th>Winner</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const teamsScores = (item.team_names || []).map((t, i) => `${t} (${item.score?.[i] ?? 0})`).join(' vs ');
                return (
                  <tr key={item._id}>
                    <td><strong>{item.event_name}</strong></td>
                    <td>{item.campus}</td>
                    <td>
                      <span className={`badge ${item.is_live ? 'badge-live' : 'badge-green'}`}>
                        {item.is_live ? '🔴 LIVE' : '✅ Done'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{teamsScores}</td>
                    <td>{item.winner || <span className="text-muted">—</span>}</td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Scorecard' : 'New Scorecard'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-grid">
              <div className="input-group">
                <label>Event Name *</label>
                <input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))}
                  placeholder="Badminton Finals" required />
              </div>
              <div className="input-group">
                <label>Campus *</label>
                <select value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}>
                  <option value="Patna">Patna</option>
                  <option value="Bihta">Bihta</option>
                  <option value="both">both</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Teams (comma-separated) *</label>
              <input value={form.team_names} onChange={e => setForm(f => ({ ...f, team_names: e.target.value }))}
                placeholder="Team Alpha, Team Omega" required />
            </div>
            <div className="input-group">
              <label>Scores (comma-separated, same order) *</label>
              <input value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                placeholder="15, 12" required />
            </div>
            <div className="input-group">
              <label>Winner (leave blank if ongoing)</label>
              <input value={form.winner} onChange={e => setForm(f => ({ ...f, winner: e.target.value }))}
                placeholder="Team Alpha" />
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_live}
                onChange={e => setForm(f => ({ ...f, is_live: e.target.checked }))} />
              Match is Live
            </label>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
