import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Leads.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_LABELS = {
  nuevo: { label: 'Nuevo', color: 'blue' },
  contactado: { label: 'Contactado', color: 'accent' },
  interesado: { label: 'Interesado', color: 'green' },
  descartado: { label: 'Descartado', color: 'red' },
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWeb, setFilterWeb] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [tone, setTone] = useState('amigable');
  const [copied, setCopied] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterWeb !== 'all') params.has_web = filterWeb === 'yes';
      if (filterStatus !== 'all') params.status = filterStatus;
      if (search) params.search = search;
      const res = await axios.get(`${API}/leads`, { params });
      setLeads(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterWeb, filterStatus, search]);

  useEffect(() => {
    const t = setTimeout(loadLeads, 300);
    return () => clearTimeout(t);
  }, [loadLeads]);

  const generateMessage = async (lead) => {
    setGenLoading(true);
    // Remove setMessage('') so it doesn't flicker empty when rotating
    try {
      const res = await axios.post(`${API}/message/generate`, {
        lead_id: lead.id,
        tone,
      });
      setMessage(res.data.message);
    } catch (e) {
      setMessage('Error generando el mensaje. Revisá que el backend esté corriendo.');
    } finally {
      setGenLoading(false);
    }
  };

  const updateStatus = async (lead, status) => {
    await axios.patch(`${API}/leads/${lead.id}/status`, { status });
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l));
    if (selected?.id === lead.id) setSelected({ ...selected, status });
  };

  const openWhatsapp = (phone, msg) => {
    const clean = phone?.replace(/\D/g, '') || '';
    const encoded = encodeURIComponent(msg);
    const num = clean.startsWith('598') ? clean : `598${clean.replace(/^0/, '')}`;
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="leads-layout">
      {/* LEFT: LIST */}
      <div className="leads-panel">
        <div className="leads-header">
          <div>
            <h1 className="page-title">Leads</h1>
            <span className="leads-count">{leads.length} resultados</span>
          </div>
        </div>

        {/* FILTERS */}
        <div className="filters">
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <div className="filter-row">
            <select value={filterWeb} onChange={e => setFilterWeb(e.target.value)}>
              <option value="all">Todos (web)</option>
              <option value="no">Sin web ⚡</option>
              <option value="yes">Con web</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos (estado)</option>
              <option value="nuevo">Nuevos</option>
              <option value="contactado">Contactados</option>
              <option value="interesado">Interesados</option>
              <option value="descartado">Descartados</option>
            </select>
          </div>
        </div>

        {/* LIST */}
        <div className="leads-list">
          {loading ? (
            <div className="empty-state">Cargando leads...</div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <span>◈</span>
              <p>No hay leads todavía.</p>
              <p>Iniciá el scraping desde el Dashboard.</p>
            </div>
          ) : (
            leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                selected={selected?.id === lead.id}
                onClick={() => { setSelected(lead); setMessage(''); }}
                onStatusChange={(s) => updateStatus(lead, s)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT: DETAIL */}
      <div className="detail-panel">
        {selected ? (
          <LeadDetail
            lead={selected}
            message={message}
            setMessage={setMessage}
            genLoading={genLoading}
            tone={tone}
            setTone={setTone}
            onGenerate={() => generateMessage(selected)}
            onOpenWpp={() => openWhatsapp(selected.phone, message)}
            onCopy={copyMessage}
            copied={copied}
            onStatusChange={(s) => updateStatus(selected, s)}
          />
        ) : (
          <div className="detail-empty">
            <span>◈</span>
            <p>Seleccioná un lead para ver el detalle y generar el mensaje de WhatsApp.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead, selected, onClick, onStatusChange }) {
  const st = STATUS_LABELS[lead.status] || STATUS_LABELS.nuevo;
  return (
    <div className={`lead-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="lead-card-top">
        <span className="lead-name">{lead.name}</span>
        <span className={`badge badge-${st.color}`}>{st.label}</span>
      </div>
      <div className="lead-card-meta">
        {lead.address && <span>📍 {lead.address}</span>}
        {lead.phone && <span>📞 {lead.phone}</span>}
      </div>
      <div className="lead-card-bottom">
        <span className={`web-tag ${lead.has_website ? 'has-web' : 'no-web'}`}>
          {lead.has_website ? '🌐 Tiene web' : '⚡ Sin web'}
        </span>
        {lead.rating && <span className="rating">★ {lead.rating}</span>}
      </div>
    </div>
  );
}

function LeadDetail({ lead, message, setMessage, genLoading, tone, setTone, onGenerate, onOpenWpp, onCopy, copied, onStatusChange }) {
  const st = STATUS_LABELS[lead.status] || STATUS_LABELS.nuevo;

  return (
    <div className="detail-content">
      <div className="detail-top">
        <div>
          <h2 className="detail-name">{lead.name}</h2>
          {lead.address && <p className="detail-addr">📍 {lead.address}</p>}
        </div>
        <span className={`badge badge-${st.color}`}>{st.label}</span>
      </div>

      <div className="detail-info">
        {lead.phone && (
          <div className="info-row">
            <span className="info-label">Teléfono</span>
            <span>{lead.phone}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Web</span>
          <span className={lead.has_website ? 'text-green' : 'text-red'}>
            {lead.has_website ? `✓ ${lead.website || 'Sí tiene'}` : '✗ No tiene'}
          </span>
        </div>
        {lead.rating && (
          <div className="info-row">
            <span className="info-label">Rating</span>
            <span>★ {lead.rating}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Fuente</span>
          <span>{lead.source}</span>
        </div>
      </div>

      {/* Status changer */}
      <div className="status-section">
        <span className="section-label">Cambiar estado</span>
        <div className="status-buttons">
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <button
              key={key}
              className={`status-btn status-btn-${val.color} ${lead.status === key ? 'active' : ''}`}
              onClick={() => onStatusChange(key)}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message generator */}
      <div className="msg-section">
        <span className="section-label">Generador de mensaje WPP</span>
        <div className="tone-selector">
          <span>Tono:</span>
          {['amigable', 'directo', 'curioso'].map(t => (
            <button
              key={t}
              className={`tone-btn ${tone === t ? 'active' : ''}`}
              onClick={() => setTone(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className="gen-btn"
          onClick={onGenerate}
          disabled={genLoading || !lead.phone}
        >
          {genLoading ? <><span className="spin">⟳</span> Generando...</> : message ? '✦ Otro mensaje (rotar)' : '✦ Generar mensaje (Local)'}
        </button>
        {!lead.phone && <p className="warn">⚠ Este lead no tiene teléfono guardado.</p>}

        {message && (
          <div className="msg-box">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
            />
            <div className="msg-actions">
              <button className="copy-btn" onClick={onCopy}>
                {copied ? '✓ Copiado!' : '⧉ Copiar'}
              </button>
              <button className="wpp-btn" onClick={onOpenWpp} disabled={!lead.phone}>
                <span>📲</span> Abrir en WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
