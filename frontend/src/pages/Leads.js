import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './Leads.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_LABELS = {
  nuevo: { label: 'Nuevo', color: 'blue' },
  contactado: { label: 'Contactado', color: 'accent' },
  interesado: { label: 'Interesado', color: 'green' },
  descartado: { label: 'Descartado', color: 'red' },
};

const FEATURE_FOLLOWUP_TEXT = `Si te interesa, te cuento rápido algunas cosas que tiene la app:

• Los mails son gratis y los mensajes automáticos de WhatsApp para recordar turnos salen menos de $1 por mensaje.
• Está integrada con Google Calendar, así que podés manejar los turnos desde ahí o desde la app.
• Te calcula las finanzas teniendo en cuenta gastos fijos como alquiler, sueldos y otros, sin que tengas que cargar todo cada vez.
• La landing la podés personalizar vos mismo desde el panel.
• Si trabajan varios barberos, podés ver todo filtrado por cada uno, incluyendo turnos, finanzas y liquidaciones.
• También tiene herramientas para retener clientes y hacer que vuelvan si hace tiempo no reservan.

Y algo importante: tus clientes pueden reservar y cancelar solos, sin tener que escribirte para coordinar.

Todo eso por menos del valor un corte al mes
Ver todas las características: https://turno.uy/#funcionalidades`;

function getScoreColor(score) {
  if (score >= 70) return 'score-hot';
  if (score >= 40) return 'score-warm';
  return 'score-cold';
}

function getScoreLabel(score) {
  if (score >= 70) return '🔥';
  if (score >= 40) return '⚡';
  return '❄️';
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWeb, setFilterWeb] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [tone, setTone] = useState('amigable');
  const [copied, setCopied] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy };
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
  }, [filterWeb, filterStatus, search, sortBy]);

  useEffect(() => {
    const t = setTimeout(loadLeads, 300);
    return () => clearTimeout(t);
  }, [loadLeads]);

  const requestMessage = async (lead) => {
    const res = await axios.post(`${API}/message/generate`, {
      lead_id: lead.id,
      tone,
    });
    return res.data.message;
  };

  const generateMessage = async (lead) => {
    setGenLoading(true);
    try {
      const generatedMessage = await requestMessage(lead);
      setMessage(generatedMessage);
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

  const updateNotes = async (lead, notes) => {
    await axios.patch(`${API}/leads/${lead.id}/notes`, { notes });
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes } : l));
    if (selected?.id === lead.id) setSelected({ ...selected, notes });
  };

  const openWhatsapp = (phone, msg) => {
    const clean = phone?.replace(/\D/g, '') || '';
    const encoded = encodeURIComponent(msg);
    const num = clean.startsWith('598') ? clean : `598${clean.replace(/^0/, '')}`;
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
  };

  const sendTemplateMessage = async (lead) => {
    if (!lead.phone) return;
    setSendLoading(true);
    try {
      const generatedMessage = await requestMessage(lead);
      setMessage(generatedMessage);
      openWhatsapp(lead.phone, generatedMessage);
    } catch (e) {
      setMessage('Error generando el mensaje. Revisá que el backend esté corriendo.');
    } finally {
      setSendLoading(false);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFeatureTemplate = () => {
    navigator.clipboard.writeText(FEATURE_FOLLOWUP_TEXT);
    setTemplateCopied(true);
    setTimeout(() => setTemplateCopied(false), 2000);
  };

  const hotCount = leads.filter(l => l.score >= 70 && l.status === 'nuevo').length;

  return (
    <div className="leads-layout">
      {/* LEFT: LIST */}
      <div className="leads-panel">
        <div className="leads-header">
          <div>
            <h1 className="page-title">Leads</h1>
            <div className="leads-count-row">
              <span className="leads-count">{leads.length} resultados</span>
              {hotCount > 0 && (
                <span className="hot-badge">🔥 {hotCount} calientes</span>
              )}
            </div>
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
          <div className="sort-row">
            <span className="sort-label">Ordenar:</span>
            {[
              { key: 'score', label: '⚡ Score' },
              { key: 'date', label: '🕐 Fecha' },
              { key: 'rating', label: '★ Rating' },
            ].map(s => (
              <button
                key={s.key}
                className={`sort-btn ${sortBy === s.key ? 'active' : ''}`}
                onClick={() => setSortBy(s.key)}
              >
                {s.label}
              </button>
            ))}
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
            onSendTemplate={() => sendTemplateMessage(selected)}
            onOpenWpp={() => openWhatsapp(selected.phone, message)}
            onCopy={copyMessage}
            copied={copied}
            onCopyFeatureTemplate={copyFeatureTemplate}
            templateCopied={templateCopied}
            onStatusChange={(s) => updateStatus(selected, s)}
            onNotesChange={(notes) => updateNotes(selected, notes)}
            sendLoading={sendLoading}
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
  const score = lead.score ?? 0;
  return (
    <div className={`lead-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="lead-card-top">
        <span className="lead-name">{lead.name}</span>
        <div className="lead-card-badges">
          <span className={`score-badge ${getScoreColor(score)}`}>
            {getScoreLabel(score)} {score}
          </span>
          <span className={`badge badge-${st.color}`}>{st.label}</span>
        </div>
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

function LeadDetail({
  lead, message, setMessage, genLoading, tone, setTone,
  onGenerate, onSendTemplate, onOpenWpp, onCopy, copied,
  onCopyFeatureTemplate, templateCopied, onStatusChange,
  onNotesChange, sendLoading
}) {
  const st = STATUS_LABELS[lead.status] || STATUS_LABELS.nuevo;
  const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);
  const score = lead.score ?? 0;

  const [notes, setNotes] = useState(lead.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef(null);

  // Sync notes when lead changes
  useEffect(() => {
    setNotes(lead.notes || '');
    setNotesSaved(false);
  }, [lead.id]);

  const handleNotesChange = (val) => {
    setNotes(val);
    setNotesSaved(false);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      onNotesChange(val);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }, 800);
  };

  return (
    <div className="detail-content">
      <div className="detail-top">
        <div>
          <h2 className="detail-name">{lead.name}</h2>
          {lead.address && <p className="detail-addr">📍 {lead.address}</p>}
        </div>
        <div className="detail-top-right">
          <span className={`score-badge score-badge-lg ${getScoreColor(score)}`}>
            {getScoreLabel(score)} Score: {score}
          </span>
          <span className={`badge badge-${st.color}`}>{st.label}</span>
        </div>
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

      {/* Notas rápidas */}
      <div className="notes-section">
        <div className="notes-header">
          <span className="section-label">Notas</span>
          {notesSaved && <span className="notes-saved">✓ Guardado</span>}
        </div>
        <textarea
          className="notes-textarea"
          placeholder="Escribí notas sobre este lead: cómo fue la charla, qué le interesó, cuándo volver a contactar..."
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          rows={3}
        />
      </div>

      {/* Message generator */}
      <div className="msg-section">
        <span className="section-label">Generador de mensaje WPP</span>
        <div className="tone-selector">
          <span>Template:</span>
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
        <div className="generator-actions">
          <button
            className="gen-btn"
            onClick={onSendTemplate}
            disabled={genLoading || sendLoading || !lead.phone}
          >
            {sendLoading ? <><span className="spin">⟳</span> Preparando...</> : `✦ Enviar template ${toneLabel}`}
          </button>
          <button
            className="secondary-btn"
            onClick={onGenerate}
            disabled={genLoading || sendLoading}
          >
            {genLoading ? <><span className="spin">⟳</span> Generando...</> : message ? 'Ver otro mensaje' : 'Generar para editar'}
          </button>
        </div>
        <div className="support-template-box">
          <div className="support-template-header">
            <span className="support-template-title">Texto extra para copiar</span>
            <button className="copy-btn" onClick={onCopyFeatureTemplate}>
              {templateCopied ? '✓ Copiado!' : '⧉ Copiar texto'}
            </button>
          </div>
          <textarea
            value={FEATURE_FOLLOWUP_TEXT}
            readOnly
            rows={12}
            className="support-template-textarea"
          />
        </div>
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
