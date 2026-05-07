import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app:         { minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: "system-ui, sans-serif" },
  header:      { background: '#1a1d2e', borderBottom: '1px solid #2d3748', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: '#63b3ed', letterSpacing: '-0.5px' },
  headerSub:   { fontSize: 13, color: '#718096', marginLeft: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  main:        { padding: '24px', maxWidth: 1400, margin: '0 auto' },
  statsRow:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  statCard:    { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: 10, padding: '16px 20px' },
  statLabel:   { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1 },
  statValue:   { fontSize: 32, fontWeight: 700, marginTop: 4 },
  section:     { marginBottom: 32 },
  sectionTitle:{ fontSize: 14, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  card:        { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  cardHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle:   { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  cardDesc:    { fontSize: 13, color: '#718096', lineHeight: 1.5 },
  cardFooter:  { display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #2d3748' },
  badge:       (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: color + '22', color }),
  dot:         (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }),
  btn:         (variant='default') => ({
    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
    background: variant === 'primary' ? '#3182ce' : variant === 'danger' ? '#e53e3e22' : '#2d3748',
    color: variant === 'danger' ? '#fc8181' : '#e2e8f0',
    transition: 'opacity 0.15s',
  }),
  tag:         { fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#2d3748', color: '#a0aec0' },
  note:        { fontSize: 12, color: '#d69e2e', background: '#d69e2e11', border: '1px solid #d69e2e33', borderRadius: 6, padding: '8px 12px', lineHeight: 1.5 },
  logsPanel:   { background: '#0d1117', border: '1px solid #2d3748', borderRadius: 10, overflow: 'hidden' },
  logsTabs:    { display: 'flex', gap: 0, borderBottom: '1px solid #2d3748', background: '#1a1d2e', overflowX: 'auto' },
  logTab:      (active) => ({ padding: '10px 16px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: active ? '2px solid #63b3ed' : '2px solid transparent', color: active ? '#63b3ed' : '#718096', background: 'none', border: 'none', borderBottom: active ? '2px solid #63b3ed' : '2px solid transparent' }),
  logBody:     { padding: 16, fontFamily: 'monospace', fontSize: 12, height: 320, overflowY: 'auto', lineHeight: 1.6 },
  logLine:     { color: '#a0aec0', marginBottom: 1 },
  missingKey:  { fontSize: 12, color: '#fc8181', background: '#fc818111', borderRadius: 4, padding: '2px 8px' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATE_COLOR = { running: '#48bb78', exited: '#e53e3e', paused: '#d69e2e', created: '#63b3ed', default: '#718096' };
const stateColor = (s) => STATE_COLOR[s] || STATE_COLOR.default;
const healthColor = (h) => h == null ? '#718096' : h.healthy ? '#48bb78' : '#e53e3e';

const CATEGORY_ORDER = ['APIs', 'Streaming', 'AI', 'Security', 'Observability', 'Infra'];

function groupByCategory(services) {
  const groups = {};
  for (const svc of services) {
    const cat = svc.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(svc);
  }
  return groups;
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({ svc, onStart, onStop, onRestart, onViewLogs }) {
  const state   = svc.container?.state || 'not started';
  const sc      = stateColor(state);
  const hc      = healthColor(svc.health);
  const running = state === 'running';

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={S.dot(running ? hc : sc)} />
            <span style={S.cardTitle}>{svc.name}</span>
          </div>
          <span style={S.badge(sc)}>{state}</span>
          {svc.health && running && (
            <span style={{ ...S.badge(hc), marginLeft: 6 }}>
              {svc.health.healthy ? `✓ ${svc.health.latencyMs}ms` : '✗ unhealthy'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={S.badge('#a0aec0')}>{svc.category}</span>
          {svc.port && <span style={{ fontSize: 11, color: '#718096' }}>:{svc.port}</span>}
        </div>
      </div>

      <p style={S.cardDesc}>{svc.description}</p>

      {svc.notes && <div style={S.note}>⚠ {svc.notes}</div>}

      {svc.missingSecrets?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#fc8181' }}>Missing secrets:</span>
          {svc.missingSecrets.map(k => <span key={k} style={S.missingKey}>{k}</span>)}
        </div>
      )}

      {svc.dependsOn?.length > 0 && (
        <div style={{ fontSize: 12, color: '#718096' }}>
          Depends on: {svc.dependsOn.join(', ')}
        </div>
      )}

      {svc.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {svc.tags.map(t => <span key={t} style={S.tag}>{t}</span>)}
        </div>
      )}

      <div style={S.cardFooter}>
        {!running && (
          <button style={S.btn('primary')} onClick={() => onStart(svc.id)}>▶ Start</button>
        )}
        {running && (
          <>
            <button style={S.btn('danger')} onClick={() => onStop(svc.id)}>■ Stop</button>
            <button style={S.btn()} onClick={() => onRestart(svc.id)}>↺ Restart</button>
          </>
        )}
        <button style={S.btn()} onClick={() => onViewLogs(svc.id)}>Logs</button>
        {running && svc.port && svc.uiPath && (
          <a href={`http://localhost:${svc.port}${svc.uiPath}`} target="_blank" rel="noreferrer"
            style={{ ...S.btn(), textDecoration: 'none', marginLeft: 'auto' }}>
            Open ↗
          </a>
        )}
        {svc.docsUrl && (
          <a href={svc.docsUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: '#63b3ed', marginLeft: svc.port ? 0 : 'auto', textDecoration: 'none' }}>
            Docs
          </a>
        )}
      </div>
    </div>
  );
}

// ── LogsPanel ─────────────────────────────────────────────────────────────────
function LogsPanel({ services, activeServiceId, setActiveServiceId }) {
  const [lines, setLines]     = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  const fetchLogs = useCallback(async (id) => {
    setLoading(true);
    setLines([]);
    try {
      const r = await fetch(`/api/logs/${id}?tail=300`);
      const d = await r.json();
      setLines(d.lines || [d.error || 'No logs available']);
    } catch (e) {
      setLines([`Error: ${e.message}`]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeServiceId) fetchLogs(activeServiceId);
  }, [activeServiceId, fetchLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);

  const runningSvcs = services.filter(s => s.container?.state === 'running');

  if (runningSvcs.length === 0) return null;

  return (
    <div style={S.logsPanel}>
      <div style={S.logsTabs}>
        {runningSvcs.map(s => (
          <button key={s.id} style={S.logTab(s.id === activeServiceId)}
            onClick={() => setActiveServiceId(s.id)}>
            {s.name}
          </button>
        ))}
        {activeServiceId && (
          <button style={{ ...S.logTab(false), marginLeft: 'auto', color: '#63b3ed' }}
            onClick={() => fetchLogs(activeServiceId)}>
            ↺ Refresh
          </button>
        )}
      </div>
      <div style={S.logBody}>
        {loading && <div style={{ color: '#718096' }}>Loading logs…</div>}
        {!loading && lines.map((l, i) => <div key={i} style={S.logLine}>{l}</div>)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [services,        setServices]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [lastRefresh,     setLastRefresh]     = useState(null);
  const [activeLogSvc,    setActiveLogSvc]    = useState(null);
  const [actionMsg,       setActionMsg]       = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      const r = await fetch('/api/services');
      const d = await r.json();
      setServices(d);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch services', e);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const t = setInterval(fetchServices, 10000); // auto-refresh every 10s
    return () => clearInterval(t);
  }, [fetchServices]);

  const apiAction = async (serviceId, action) => {
    setActionMsg(`${action}ing ${serviceId}…`);
    try {
      await fetch(`/api/services/${serviceId}/${action}`, { method: 'POST' });
      await fetchServices();
      setActionMsg(null);
    } catch (e) {
      setActionMsg(`Error: ${e.message}`);
    }
  };

  const groups  = groupByCategory(services);
  const running = services.filter(s => s.container?.state === 'running').length;
  const healthy = services.filter(s => s.health?.healthy).length;
  const missing = services.filter(s => s.missingSecrets?.length > 0).length;

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={S.headerTitle}>DemoBench</span>
          <span style={S.headerSub}>Codespace</span>
        </div>
        <div style={S.headerRight}>
          {actionMsg && <span style={{ fontSize: 13, color: '#63b3ed' }}>{actionMsg}</span>}
          <button style={S.btn()} onClick={fetchServices}>↺ Refresh</button>
          {lastRefresh && (
            <span style={{ fontSize: 12, color: '#718096' }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <main style={S.main}>
        {/* Stats row */}
        <div style={S.statsRow}>
          <div style={S.statCard}>
            <div style={S.statLabel}>Total Services</div>
            <div style={{ ...S.statValue, color: '#63b3ed' }}>{services.length}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Running</div>
            <div style={{ ...S.statValue, color: '#48bb78' }}>{running}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Healthy</div>
            <div style={{ ...S.statValue, color: '#48bb78' }}>{healthy}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Missing Secrets</div>
            <div style={{ ...S.statValue, color: missing > 0 ? '#d69e2e' : '#48bb78' }}>{missing}</div>
          </div>
        </div>

        {loading && <div style={{ color: '#718096', textAlign: 'center', padding: 40 }}>Loading services…</div>}

        {/* Service groups */}
        {CATEGORY_ORDER.filter(cat => groups[cat]).map(cat => (
          <div key={cat} style={S.section}>
            <div style={S.sectionTitle}>{cat}</div>
            <div style={S.grid}>
              {groups[cat].map(svc => (
                <ServiceCard key={svc.id} svc={svc}
                  onStart={id => apiAction(id, 'start')}
                  onStop={id => apiAction(id, 'stop')}
                  onRestart={id => apiAction(id, 'restart')}
                  onViewLogs={id => setActiveLogSvc(id === activeLogSvc ? null : id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Other categories not in the defined order */}
        {Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)).map(cat => (
          <div key={cat} style={S.section}>
            <div style={S.sectionTitle}>{cat}</div>
            <div style={S.grid}>
              {groups[cat].map(svc => (
                <ServiceCard key={svc.id} svc={svc}
                  onStart={id => apiAction(id, 'start')}
                  onStop={id => apiAction(id, 'stop')}
                  onRestart={id => apiAction(id, 'restart')}
                  onViewLogs={id => setActiveLogSvc(id === activeLogSvc ? null : id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Logs panel */}
        {services.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Container Logs</div>
            <LogsPanel
              services={services}
              activeServiceId={activeLogSvc}
              setActiveServiceId={setActiveLogSvc}
            />
          </div>
        )}
      </main>
    </div>
  );
}
