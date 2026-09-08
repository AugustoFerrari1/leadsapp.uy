import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import './App.css';

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app">
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <span className="logo-icon">✂</span>
          <span className="logo-text">BarberLead</span>
        </div>
        <span className="mobile-version">v1.0</span>
      </header>

      <Sidebar page={page} setPage={setPage} />

      <main className="main">
        {page === 'dashboard' && <Dashboard onNavigateToLeads={() => setPage('leads')} />}
        {page === 'leads' && <Leads />}
      </main>

      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
          aria-label="Dashboard"
        >
          <span className="mobile-nav-icon">⬡</span>
          <span className="mobile-nav-label">Dashboard</span>
        </button>
        <button
          className={`mobile-nav-item ${page === 'leads' ? 'active' : ''}`}
          onClick={() => setPage('leads')}
          aria-label="Leads"
        >
          <span className="mobile-nav-icon">◈</span>
          <span className="mobile-nav-label">Leads</span>
        </button>
      </nav>
    </div>
  );
}

function Sidebar({ page, setPage }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">✂</span>
        <span className="logo-text">BarberLead</span>
      </div>
      <div className="sidebar-nav">
        <button
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <span>⬡</span> Dashboard
        </button>
        <button
          className={`nav-item ${page === 'leads' ? 'active' : ''}`}
          onClick={() => setPage('leads')}
        >
          <span>◈</span> Leads
        </button>
      </div>
      <div className="sidebar-footer">
        <span className="version">v1.0</span>
      </div>
    </nav>
  );
}
