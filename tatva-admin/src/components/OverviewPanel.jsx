import { useEffect, useState } from 'react';
import api from '../api';

export default function OverviewPanel() {
  const [stats, setStats] = useState({ events: 0, announcements: 0, sports: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // Events: fetch both types and combine counts
      Promise.all([
        api.get('/events/sports').catch(() => ({ data: [] })),
        api.get('/events/cultural').catch(() => ({ data: [] })),
      ]).then(([s, c]) => {
        const sCount = Array.isArray(s.data) ? s.data.length : s.data.data?.length || 0;
        const cCount = Array.isArray(c.data) ? c.data.length : c.data.data?.length || 0;
        return sCount + cCount;
      }),
      api.get('/announcements').then(r => r.data.data?.length || 0).catch(() => 0),
      api.get('/sports').then(r => {
        const list = r.data.data || [];
        return list.filter(item => item.is_live === true).length;
      }).catch(() => 0),
      api.get('/users').then(r => r.data.data?.length || 0).catch(() => 0),
    ]).then(([events, announcements, sports, users]) => {
      setStats({ events, announcements, sports, users });
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Events', value: stats.events, icon: '🎪', color: 'indigo' },
    { label: 'Announcements', value: stats.announcements, icon: '📢', color: 'violet' },
    { label: 'Live Scores', value: stats.sports, icon: '🏆', color: 'amber' },
    { label: 'Users', value: stats.users, icon: '👥', color: 'emerald' },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>System Overview</h3>
      </div>
      {loading ? (
        <div className="loading-state">Loading stats...</div>
      ) : (
        <div className="stats-grid">
          {cards.map(card => (
            <div key={card.label} className={`stat-card stat-${card.color}`}>
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-info">
                <h4>{card.value}</h4>
                <p>{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="info-card" style={{ marginTop: '24px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Welcome to the Tatva Admin Portal. Use the sidebar to manage events, announcements, live sports scores and users.
        </p>
      </div>
    </div>
  );
}
