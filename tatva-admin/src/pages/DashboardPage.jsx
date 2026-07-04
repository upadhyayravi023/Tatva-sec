import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import OverviewPanel from '../components/OverviewPanel';
import EventsPanel from '../components/EventsPanel';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import SportsPanel from '../components/SportsPanel';
import UsersPanel from '../components/UsersPanel';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const panels = {
    overview: <OverviewPanel />,
    events: <EventsPanel />,
    announcements: <AnnouncementsPanel />,
    sports: <SportsPanel />,
    users: <UsersPanel />,
  };

  const titles = {
    overview: 'Dashboard Overview',
    events: 'Events Manager',
    announcements: 'Announcements Board',
    sports: 'Live Scoreboard Center',
    users: 'System Users',
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="main-content">
        <header className="content-header">
          <div>
            <h2>{titles[activeTab]}</h2>
            <p className="header-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="header-user">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'A'}</div>
            <span>{user?.name || 'Admin'}</span>
          </div>
        </header>
        <div className="panel-content">
          {panels[activeTab] || panels.overview}
        </div>
      </main>
    </div>
  );
}
