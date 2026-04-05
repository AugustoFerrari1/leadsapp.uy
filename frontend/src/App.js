import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import './App.css';

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      <main className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'leads' && <Leads />}
      </main>
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
