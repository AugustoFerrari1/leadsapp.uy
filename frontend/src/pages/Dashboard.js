import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeTotal, setScrapeTotal] = useState(0);
  const [lastRun, setLastRun] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    loadStats();
    const saved = localStorage.getItem('lastRun');
    if (saved) setLastRun(saved);
  }, []);

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const startScraping = async () => {
    try {
      await axios.post(`${API}/scrape/start`);
      setScraping(true);
      setScrapeMsg('Iniciando búsqueda...');

      // Poll status every 2s
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/scrape/status`);
          const { running, message, progress, total } = res.data;
          setScrapeMsg(message);
          setScrapeProgress(progress);
          setScrapeTotal(total);
          if (!running) {
            clearInterval(interval);
            setScraping(false);
            const now = new Date().toLocaleString('es-UY');
            setLastRun(now);
            localStorage.setItem('lastRun', now);
            loadStats();
          }
        } catch (e) {
          clearInterval(interval);
          setScraping(false);
        }
      }, 2000);

    } catch (e) {
      if (e.response?.data?.detail) {
        setScrapeMsg('⚠️ ' + e.response.data.detail);
      }
    }
  };

  const pct = scrapeTotal > 0 ? Math.round((scrapeProgress / scrapeTotal) * 100) : 0;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Buscá y gestioná tus leads de barberías en Uruguay</p>
        </div>
        {lastRun && <span className="last-run">Último scraping: {lastRun}</span>}
      </div>

      {/* SCRAPE BUTTON */}
      <div className="scrape-card">
        <div className="scrape-card-left">
          <h2>🗺 Buscar barberías</h2>
          <p>Scrapea Google Maps en múltiples zonas de Montevideo y guarda los leads automáticamente en tu base de datos.</p>
          {scrapeMsg && (
            <div className="scrape-status">
              <span className={scraping ? 'pulse' : ''}>{scrapeMsg}</span>
              {scraping && scrapeTotal > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                  <span>{scrapeProgress}/{scrapeTotal} zonas</span>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          className={`scrape-btn ${scraping ? 'scraping' : ''}`}
          onClick={startScraping}
          disabled={scraping}
        >
          {scraping ? (
            <><span className="spin">⟳</span> Scrapeando...</>
          ) : (
            <><span>▶</span> Iniciar Scraping</>
          )}
        </button>
      </div>

      {/* STATS */}
      {stats && (
        <div className="stats-grid">
          <StatCard label="Total Leads" value={stats.total} icon="◈" color="accent" />
          <StatCard label="Sin web" value={stats.without_website} icon="✗" color="red" sub="Mejor oportunidad" />
          <StatCard label="Con web" value={stats.with_website} icon="✓" color="green" sub="Ya digitalizados" />
          <StatCard label="Contactados" value={stats.contacted} icon="✉" color="blue" />
          <StatCard label="Nuevos" value={stats.new} icon="★" color="accent" />
        </div>
      )}

      {/* TIPS */}
      <div className="tips-card">
        <h3>💡 Cómo usar esto</h3>
        <ol>
          <li>Hacé click en <strong>Iniciar Scraping</strong> — se buscan barberías en 10 zonas de Montevideo automáticamente.</li>
          <li>Andá a <strong>Leads</strong> para ver y filtrar los resultados.</li>
          <li>Filtrá por <em>"sin web"</em> para encontrar los prospectos más calientes.</li>
          <li>Seleccioná un lead, generá el mensaje y abrí WhatsApp con un click.</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
