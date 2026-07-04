const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'events', label: 'Events', icon: '🎪' },
  { id: 'announcements', label: 'Announcements', icon: '📢' },
  { id: 'sports', label: 'Live Sports', icon: '🏆' },
  { id: 'users', label: 'Users', icon: '👥' },
];

export default function Sidebar({ activeTab, onTabChange, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🎓</span>
        <span className="brand-text">Tatva Admin</span>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'A'}</div>
        <div className="user-info">
          <span className="user-name">{user?.name || 'Admin'}</span>
          <span className="user-role">{user?.role || 'admin'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="logout-btn" onClick={onLogout}>
        <span>⏻</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
