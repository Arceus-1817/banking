import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import LocalChatbot from './components/dashboard/LocalChatbot';

// ─── Design Tokens (Premium FinTech Theme) ──────────────────────────────────
// ─── Design Tokens (Premium FinTech Theme) ──────────────────────────────────
const G = {
  bg:        '#F3F4F6', // Slate Gray background
  surface:   '#FFFFFF', // Crisp White surface
  card:      '#FFFFFF', // Crisp White card background
  border:    '#E2E8F0', // Soft gray borders
  borderHi:  '#CBD5E0', // Highlighted gray borders
  accent:    '#D4AF37', // Champagne Gold accent
  accentDim: '#AA8222', // Hover gold
  accentBg:  'rgba(212, 175, 55, 0.08)', // Soft gold tint
  accentGlow:'rgba(212, 175, 55, 0.2)',  // Gold glow
  muted:     '#718096',
  text:      '#0A1128', // Deep Sapphire Navy text
  textSub:   '#4A5568', // Slate grey secondary text
  danger:    '#ff4757', // Ruby Red
  warn:      '#ffa502', // Amber
  info:      '#3b82f6', // Sapphire Blue
  purple:    '#8b5cf6', // Purple
  rLg:       '12px',
  sidebar: {
    bg: '#0A1128', // Deep Sapphire Navy sidebar
    text: '#FFFFFF', // Crisp White text
    textSub: '#A0ABC0', // Slate Grey sidebar text
    border: '#1E2D5A'   // Navy border
  }
};

// ─── Global styles ────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:${G.bg}; --surface:${G.surface}; --card:${G.card};
    --border:${G.border}; --border-hi:${G.borderHi};
    --accent:${G.accent}; --accent-dim:${G.accentDim};
    --accent-bg:${G.accentBg}; --accent-glow:${G.accentGlow};
    --muted:${G.muted}; --text:${G.text}; --text-sub:${G.textSub};
    --danger:${G.danger}; --warn:${G.warn}; --info:${G.info}; --purple:${G.purple};
    --r:6px; --r-lg:12px;
    --font-display: 'Playfair Display', serif;
    --font-mono: 'Inter', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-mono); overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 3px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
  @keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }

  .fade-up { animation: fadeUp .4s ease both }
  .fade-up-1 { animation: fadeUp .4s .04s ease both }
  .fade-up-2 { animation: fadeUp .4s .08s ease both }
  .fade-up-3 { animation: fadeUp .4s .12s ease both }
  .fade-up-4 { animation: fadeUp .4s .16s ease both }
  .fade-up-5 { animation: fadeUp .4s .20s ease both }

  .skeleton { background: linear-gradient(90deg, #EDF2F7 25%, #E2E8F0 50%, #EDF2F7 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }

  input, select, textarea { font-family: var(--font-mono); background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: var(--r); padding: 12px 16px; font-size: 14px; width: 100%; outline: none; transition: all .2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
  input:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
  input:disabled { opacity: 0.6; cursor: not-allowed; background: var(--bg); }
  input::placeholder { color: var(--muted); }

  button { font-family: var(--font-mono); cursor: pointer; border: none; outline: none; transition: all .2s; }
  .btn-primary { background: var(--accent); color: #0A1128; font-weight: 600; font-size: 13px; padding: 12px 24px; border-radius: var(--r); letter-spacing: .05em; text-transform: uppercase; box-shadow: 0 4px 12px rgba(212,175,55,0.2); }
  .btn-primary:hover:not(:disabled) { background: var(--accent-dim); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(212,175,55,0.3); }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

  .btn-ghost { background: transparent; color: var(--text-sub); font-size: 13px; font-weight: 500; padding: 12px 24px; border-radius: var(--r); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--text); color: var(--text); background: var(--surface); }

  .btn-danger { background: rgba(255, 71, 87, 0.1); color: var(--danger); font-weight: 600; font-size: 12px; padding: 10px 18px; border-radius: var(--r); border: 1px solid rgba(255, 71, 87, 0.3); text-transform: uppercase; letter-spacing: 0.05em; }
  .btn-danger:hover { background: rgba(255, 71, 87, 0.2); }

  .btn-warn { background: rgba(255, 165, 2, 0.1); color: var(--warn); font-weight: 600; font-size: 12px; padding: 10px 18px; border-radius: var(--r); border: 1px solid rgba(255, 165, 2, 0.3); text-transform: uppercase; letter-spacing: 0.05em; }
  .btn-warn:hover { background: rgba(255, 165, 2, 0.2); }

  .tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .tag-green { background: #E6FFFA; color: #234E52; border: 1px solid #B2F5EA; }
  .tag-red { background: #FFF5F5; color: #C53030; border: 1px solid #FEB2B2; }
  .tag-amber { background: #FFFAF0; color: #B7791F; border: 1px solid #FEEBC8; }
  .tag-blue { background: #EBF8FF; color: #2B6CB0; border: 1px solid #90CDF4; }
  .tag-purple { background: #FAF5FF; color: #6B46C1; border: 1px solid #D6BCFA; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtR = (n) => `₹${fmt(n)}`;
const colors = ['#D4AF37', '#3182CE', '#2F855A', '#805AD5', '#DD6B20', '#38B2AC'];
const roleTag = { AGENT:'tag-green', MANAGER:'tag-purple', ADMIN:'tag-blue' };

function initials(name = 'NA') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Components ───────────────────────────────────────────────────────────────
function SparkBar({ data = [], color = '#D4AF37', height = 36 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex:1, minHeight:4, borderRadius:'2px 2px 0 0',
          height:`${(v / max) * 100}%`,
          background: i === data.length - 1 ? color : `${color}44`,
          transition:'height .4s ease',
        }}/>
      ))}
    </div>
  );
}

function AnimCount({ value = 0, prefix = '', dur = 1000 }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let s = 0;
    const end = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    if (!end) return;
    const step = end / (dur / 16);
    const t = setInterval(() => {
      s = Math.min(s + step, end);
      setDisp(Math.floor(s));
      if (s >= end) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [value, dur]);
  return <>{prefix}{disp.toLocaleString('en-IN')}</>;
}

function StatCard({ label, value, prefix = '', sub, spark, color = '#D4AF37', icon, delay = 1 }) {
  return (
    <div className={`fade-up-${delay}`} style={{
      background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg,
      padding:'24px', display:'flex', flexDirection:'column', gap:12,
      position:'relative', overflow:'hidden', transition:'all .2s',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${color}15`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.03)'; }}>
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right,${color}15,transparent 70%)`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:12, color:G.textSub, letterSpacing:'.08em', textTransform:'uppercase', fontWeight:600 }}>{label}</span>
        {icon && <span style={{ width:36, height:36, borderRadius:4, background:`${color}10`, color: color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, border: `1px solid ${color}22` }}>{icon}</span>}
      </div>
      <div style={{ fontSize:32, fontFamily:'var(--font-display)', fontWeight:700, color:G.text, lineHeight:1 }}>
        <AnimCount value={value} prefix={prefix} />
      </div>
      {sub && <div style={{ fontSize:12, color:G.textSub, fontWeight: 500 }}>{sub}</div>}
      {spark && <SparkBar data={spark} color={color} height={36} />}
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = 560 }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000, background:'rgba(10, 12, 15, 0.8)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, width:'100%', maxWidth, animation:'fadeUp .22s ease', maxHeight:'90vh', overflowY:'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'20px 28px', borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:G.card, zIndex:10 }}>
          <h3 style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, color: G.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:G.surface, color:G.textSub, borderRadius:4, width:32, height:32, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', border: `1px solid ${G.border}` }}>×</button>
        </div>
        <div style={{ padding:28 }}>{children}</div>
      </div>
    </div>
  );
}

function field(label, value, onChange, opts = {}) {
  const { type = 'text', placeholder, options, disabled = false } = opts;
  const displayValue = (value === null || value === undefined || value === 'null') ? '' : value;
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:G.textSub, marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>{label}</label>
      {options ? (
        <select value={displayValue} onChange={e => onChange(e.target.value)} disabled={disabled}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={displayValue} onChange={e => onChange(e.target.value)} placeholder={placeholder || label} disabled={disabled} />
      )}
    </div>
  );
}

// ─── Ticker Bar ───────────────────────────────────────────────────────────────
function TickerBar({ stats }) {
  const items = stats ? [
    `AGENTS ACTIVE: ${stats.agentCount ?? '—'}`,
    `CUSTOMER ACCOUNTS: ${stats.customerCount ?? '—'}`,
    `BRANCHES ONLINE: ${stats.branchCount ?? '—'}`,
    `TODAY'S LIQUIDITY: ${fmtR(stats.todayCollection)}`,
    `PORTFOLIO VALUATION: ${fmtR(stats.totalPortfolio)}`,
    `TXN VOLUME: ${stats.todayTxnCount ?? 0}`,
  ] : ['Synchronizing institutional data…'];
  const text = items.join('   ✦   ');
  return (
    <div style={{ background: G.sidebar.bg, borderBottom:`1px solid ${G.accent}44`, height:40, overflow:'hidden', display:'flex', alignItems:'center' }}>
      <div style={{ padding:'0 20px', flexShrink:0, fontSize:11, color:G.accent, letterSpacing:'.1em', fontWeight:700, borderRight:`1px solid ${G.accent}44`, background: '#070D1F' }}>SYSTEM LIVE</div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'inline-block', whiteSpace:'nowrap', animation:'ticker 40s linear infinite', fontSize:12, color:'#E2E8F0', letterSpacing:'.05em', fontWeight: 500 }}>
          {text}{'    ✦    '}{text}
        </div>
      </div>
    </div>
  );
}

// ─── BANK INTEGRATION SYNC TAB ──────────────────────────────────────────────
function SyncTab({ token: _token, tenantId, authH, onSyncSuccess }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [file, setFile] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  // Twilio states
  const [twilioStatus, setTwilioStatus] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('Hello! This is a test receipt from PigmyPay Twilio integration.');
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioLog, setTwilioLog] = useState(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('http://localhost:8085/api/sync/logs', authH);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchTwilioStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8085/api/twilio/status', authH);
      setTwilioStatus(res.data);
    } catch (e) {
      console.error("Failed to load Twilio status", e);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => { fetchLogs(); fetchTwilioStatus(); });
  }, []);

  const handleTestTwilio = async () => {
    if (!testPhone) return;
    setTestingTwilio(true);
    setTwilioLog(null);
    try {
      const res = await axios.post(`http://localhost:8085/api/twilio/test?phoneNumber=${testPhone}&message=${encodeURIComponent(testMsg)}`, {}, authH);
      setTwilioLog({ type: 'success', text: res.data });
    } catch (e) {
      setTwilioLog({ type: 'error', text: e.response?.data || 'Failed to dispatch test message.' });
    } finally {
      setTestingTwilio(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSyncResult(null);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setSyncResult(null);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:8085/api/sync/import', formData, {
        headers: {
          ...authH.headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSyncResult(res.data);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('bank-file-input');
      if (fileInput) fileInput.value = '';
      
      fetchLogs();
      onSyncSuccess();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.response?.data?.error ||
        (typeof e.response?.data === 'string' ? e.response.data : 'Failed to process file. Ensure column mapping is correct.')
      );
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await axios({
        url: 'http://localhost:8085/api/sync/export',
        method: 'GET',
        responseType: 'blob',
        headers: authH.headers
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tx_journal_${tenantId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      fetchLogs();
    } catch (_e) {
      alert('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, letterSpacing: '-.01em', color: G.text }}>Bank Integration (ETL)</h1>
        <p style={{ color: G.textSub, fontSize: 14, marginTop: 6, fontWeight: 500 }}>
          Synchronize client accounts and export collection logs in standard banking CSV/TXT format.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }}>
        {/* INBOUND CARD */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Inbound Core Sync (Import)</div>
              <div style={{ fontSize: 12, color: G.textSub, marginTop: 4, fontWeight: 500 }}>Update clients and outstanding EMIs from Bank's Database</div>
            </div>
          </div>
          
          <div style={{ background: G.surface, border: `1.5px dashed ${G.borderHi}`, borderRadius: 8, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', cursor: 'pointer' }}
               onClick={() => document.getElementById('bank-file-input').click()}>
            <input id="bank-file-input" type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
            <span style={{ fontSize: 32, opacity: 0.7 }}>📄</span>
            {file ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: G.accent }}>{file.name}</div>
                <div style={{ fontSize: 11, color: G.textSub, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: G.text }}>Select Bank Drop File</div>
                <div style={{ fontSize: 11, color: G.textSub, marginTop: 4 }}>Supports CSV and TXT database exports</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(255, 71, 87, 0.1)', border: `1px solid ${G.danger}33`, color: G.danger, borderRadius: 6, padding: '12px 16px', fontSize: 12, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {syncResult && (
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: `1px solid ${G.accent}33`, color: G.accent, borderRadius: 6, padding: '12px 16px', fontSize: 12, fontWeight: 500 }}>
              <div>Sync Status: <strong>{syncResult.status}</strong></div>
              <div style={{ marginTop: 4 }}>Imported: <strong>{syncResult.totalRecordsFound}</strong> client records successfully synchronized.</div>
            </div>
          )}

          <button className="btn-primary" style={{ marginTop: 'auto', padding: '16px' }} disabled={!file || uploading} onClick={handleImport}>
            {uploading ? 'Processing ETL Pipeline...' : 'Process Bank Drop'}
          </button>
        </div>

        {/* OUTBOUND CARD */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📤</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Outbound Core Sync (Export)</div>
              <div style={{ fontSize: 12, color: G.textSub, marginTop: 4, fontWeight: 500 }}>Reconcile collected deposits back to Bank's Database</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: 24, textAlign: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: G.accent, letterSpacing: '.05em', fontWeight: 700 }}>RECONCILIATION FILE STATUS</span>
            <div style={{ fontSize: 14, color: G.text, fontWeight: 600 }}>Collect daily logs and generate standard journal export.</div>
            <div style={{ fontSize: 11, color: G.textSub }}>File will include TxID, Customer ID, Loan ID, Amount, Payment Mode and Agent IDs.</div>
          </div>

          <button className="btn-primary" style={{ padding: '16px', background: G.text, color: G.surface }} disabled={exporting} onClick={handleExport}>
            {exporting ? 'Generating Journal...' : 'Generate & Download Collections Log'}
          </button>
        </div>
      </div>

      {/* TWILIO DIAGNOSTICS CARD */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>💬</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Twilio WhatsApp Integration Diagnostics</div>
              <div style={{ fontSize: 12, color: G.textSub, marginTop: 4, fontWeight: 500 }}>Monitor WhatsApp receipt configurations and test dispatching</div>
            </div>
          </div>
          {twilioStatus && (
            <span style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background: twilioStatus.configured ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)',
              color: twilioStatus.configured ? G.accent : G.danger,
              border: `1px solid ${twilioStatus.configured ? G.accent : G.danger}33`,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {twilioStatus.configured ? '● Connected' : '○ Not Configured'}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, background: G.surface, padding: 20, borderRadius: 8, border: `1px solid ${G.border}` }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: G.text, marginBottom: 8 }}>Test Recipient Phone Number (WhatsApp)</label>
            <input className="ag-input" placeholder="e.g. +919876543210" value={testPhone} onChange={e => setTestPhone(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: G.text, marginBottom: 8 }}>Test Message Body</label>
            <input className="ag-input" placeholder="Receipt text" value={testMsg} onChange={e => setTestMsg(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
          </div>
        </div>

        {twilioLog && (
          <div style={{ background: twilioLog.type === 'success' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)', border: `1px solid ${twilioLog.type === 'success' ? G.accent : G.danger}33`, color: twilioLog.type === 'success' ? G.accent : G.danger, borderRadius: 6, padding: '12px 16px', fontSize: 12, fontWeight: 500 }}>
            {twilioLog.text}
          </div>
        )}

        <button className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', fontSize: 13 }} disabled={!testPhone || testingTwilio} onClick={handleTestTwilio}>
          {testingTwilio ? 'Dispatching Receipt...' : 'Send Test WhatsApp Message'}
        </button>
      </div>

      {/* SYNC HISTORY TABLE */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${G.border}`, background: G.surface }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: G.text }}>ETL Synchronization History</div>
          <div style={{ fontSize: 12, color: G.textSub, marginTop: 4, fontWeight: 500 }}>Audit trail of inbound and outbound bank sync events</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr 120px 120px', gap: 20, padding: '16px 24px', borderBottom: `1px solid ${G.border}`, background: G.surface, fontSize: 11, fontWeight: 700, color: G.textSub, letterSpacing: '1px', textTransform: 'uppercase' }}>
          <div>Timestamp</div><div>Direction</div><div>Filename</div><div>Records</div><div>Status</div>
        </div>

        {loadingLogs ? (
          <div style={{ padding: 24 }}>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 10 }} />)}</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: G.muted, fontSize: 13, fontStyle: 'italic' }}>No synchronization logs found.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr 120px 120px', alignItems: 'center', gap: 20, padding: '14px 24px', borderBottom: `1px solid ${G.border}`, fontSize: 13 }}>
              <div style={{ color: G.text, fontWeight: 500 }}>{new Date(log.syncDate).toLocaleString('en-IN')}</div>
              <div>
                <span className={`tag ${log.syncDirection === 'INBOUND' ? 'tag-green' : 'tag-blue'}`}>
                  {log.syncDirection}
                </span>
              </div>
              <div style={{ color: G.textSub, fontFamily: 'monospace' }}>{log.fileName}</div>
              <div style={{ color: G.text, fontWeight: 600 }}>{log.totalRecordsFound}</div>
              <div>
                <span className={`tag ${log.status === 'SUCCESS' ? 'tag-green' : 'tag-red'}`}>
                  {log.status}
                </span>
                {log.status === 'CRITICAL_FAIL' && log.errorReport && (
                  <div style={{ color: G.danger, fontSize: 10, marginTop: 4, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.errorReport}>
                    {log.errorReport}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Forms & Modals ───────────────────────────────────────────────────────────
function AddAgentForm({ user, branches, onSuccess, onClose }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('AGENT');
  const [branchId, setBranch]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Payroll & Identity states
  const [commissionRate, setCommissionRate] = useState('');
  const [baseSalary, setBaseSalary]         = useState('');
  const [panNumber, setPanNumber]           = useState('');
  const [aadhaarNumber, setAadhaarNumber]   = useState('');
  const [bankName, setBankName]             = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode]     = useState('');
  const [dateOfBirth, setDateOfBirth]       = useState('');
  const [dateOfJoining, setDateOfJoining]   = useState('');

  const submit = async () => {
    if (!name || !email || !password) { setError('Name, email and password are required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('http://localhost:8085/api/users', {
        name, email, phoneNumber: phone, password, role, tenantId: user.tenantId, branchId: branchId ? parseInt(branchId) : null,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
        baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
        panNumber: panNumber || null,
        aadhaarNumber: aadhaarNumber || null,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankIfscCode: bankIfscCode || null,
        dateOfBirth: dateOfBirth || null,
        dateOfJoining: dateOfJoining || null
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      await onSuccess();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.response?.data?.error ||
        (typeof e.response?.data === 'string' ? e.response.data : 'Failed to create user.')
      );
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
        {field('Full name',  name,     setName)}
        {field('Phone',      phone,    setPhone,    { placeholder:'Mobile number' })}
        {field('Email',      email,    setEmail,    { type:'email', placeholder:'Corporate email' })}
        {field('Password',   password, setPassword, { type:'password', placeholder:'Min 6 characters' })}
        {field('Role', role, setRole, { options:[
                  { value:'AGENT', label:'Field Agent' },
                  ...(user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' ? [
                    { value:'MANAGER', label:'Branch Manager' },
                    { value:'ADMIN', label:'System Admin' }
                  ] : [])
                ]})}
        {field('Branch Assignment', branchId, setBranch,   { options:[
          { value:'', label:'— HQ / Unassigned —' },
          ...branches.map(b => ({ value: String(b.id), label: b.name })),
        ]})}

        <div style={{ gridColumn: 'span 2', height: 1, background: G.border, margin: '16px 0' }} />
        <h4 style={{ gridColumn: 'span 2', fontSize: 11, color: G.textSub, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12, fontWeight: 700 }}>Compensation & Identity</h4>
        
        {field('Commission Rate (%)', commissionRate, setCommissionRate, { type:'number', placeholder:'e.g. 2.5' })}
        {field('Base Salary (₹)', baseSalary, setBaseSalary, { type:'number', placeholder:'e.g. 15000' })}
        {field('PAN Card Number', panNumber, setPanNumber, { placeholder:'10 characters' })}
        {field('Aadhaar Card Number', aadhaarNumber, setAadhaarNumber, { placeholder:'12 digits' })}
        {field('Date of Birth', dateOfBirth, setDateOfBirth, { type:'date' })}
        {field('Date of Joining', dateOfJoining, setDateOfJoining, { type:'date' })}

        <div style={{ gridColumn: 'span 2', height: 1, background: G.border, margin: '16px 0' }} />
        <h4 style={{ gridColumn: 'span 2', fontSize: 11, color: G.textSub, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12, fontWeight: 700 }}>Bank Account Details</h4>

        {field('Bank Name', bankName, setBankName, { placeholder:'e.g. ICICI Bank' })}
        {field('Account Number', bankAccountNumber, setBankAccountNumber, { placeholder:'Bank account number' })}
        {field('IFSC Code', bankIfscCode, setBankIfscCode, { placeholder:'e.g. ICIC0000123' })}
        <div style={{ gridColumn: 'span 2', height: 12 }} />
      </div>
      {error && <div style={{ background:'#FFF5F5', border:'1px solid #FEB2B2', borderRadius:4, padding:'12px 16px', fontSize:13, color:G.danger, marginBottom:20, fontWeight: 500 }}>{error}</div>}
      <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop: 8 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? 'Provisioning…' : 'Provision User'}</button>
      </div>
    </div>
  );
}

function EditUserModal({ user, agent, branches, token, onSuccess, onClose }) {
  const [name,     setName]    = useState(agent.name || '');
  const [phone,    setPhone]   = useState(agent.phoneNumber || '');
  const [role,     setRole]    = useState(agent.role || 'AGENT');
  const [branchId, setBranch]  = useState(agent.branch?.id ? String(agent.branch.id) : '');
  const [newPass,  setNewPass] = useState('');
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState('');
  const [manualDevice, setManualDevice] = useState(agent.registeredDeviceId || '');

  const handleManualDeviceBind = async () => {
    if (loading) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.put(`http://localhost:8085/api/users/${agent.id}/manual-device-id`, { deviceId: manualDevice }, authH);
      setSuccess('Device ID bound manually.');
      await onSuccess();
    } catch (e) { setError(e.response?.data?.message || 'Manual binding failed.'); }
    finally { setLoading(false); }
  };

  const handleApproveDevice = async () => {
    if (loading) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.post(`http://localhost:8085/api/users/${agent.id}/approve-device`, {}, authH);
      setSuccess('Device binding approved successfully.');
      await onSuccess();
    } catch (e) { setError(e.response?.data?.message || 'Approval failed.'); }
    finally { setLoading(false); }
  };

  // Payroll & Identity states
  const [commissionRate, setCommissionRate] = useState(agent.commissionRate !== undefined ? String(agent.commissionRate) : '0');
  const [baseSalary, setBaseSalary]         = useState(agent.baseSalary !== undefined ? String(agent.baseSalary) : '0');
  const [panNumber, setPanNumber]           = useState(agent.panNumber || '');
  const [aadhaarNumber, setAadhaarNumber]   = useState(agent.aadhaarNumber || '');
  const [bankName, setBankName]             = useState(agent.bankName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(agent.bankAccountNumber || '');
  const [bankIfscCode, setBankIfscCode]     = useState(agent.bankIfscCode || '');
  const [dateOfBirth, setDateOfBirth]       = useState(agent.dateOfBirth || '');
  const [dateOfJoining, setDateOfJoining]   = useState(agent.dateOfJoining || '');

  const authH = { headers: { Authorization: "Bearer " + token } };

  const saveDetails = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.put(`http://localhost:8085/api/users/${agent.id}`, {
        name, phoneNumber: phone, role, branchId: branchId ? parseInt(branchId) : null,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
        baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
        panNumber: panNumber || null,
        aadhaarNumber: aadhaarNumber || null,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankIfscCode: bankIfscCode || null,
        dateOfBirth: dateOfBirth || null,
        dateOfJoining: dateOfJoining || null
      }, authH);
      setSuccess('User identity updated successfully.');
      await onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || (typeof e.response?.data === 'string' ? e.response?.data : null) || 'Update failed.');
    }
    finally { setLoading(false); }
  };

  const resetPass = async () => {
    if (!newPass || newPass.length < 6) { setError('Password must be at least 6 chars.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.patch(`http://localhost:8085/api/users/${agent.id}/password`, { password: newPass }, authH);
      setSuccess('Security credentials reset.'); setNewPass('');
    } catch (e) { setError(e.response?.data?.message || 'Credential reset failed.'); }
    finally { setLoading(false); }
  };

  const deleteUser = async () => {
    if (!window.confirm(`Terminate access for ${agent.name}? This generates an audit log and cannot be undone.`)) return;
    setLoading(true);
    try {
      await axios.delete(`http://localhost:8085/api/users/${agent.id}`, authH);
      await onSuccess();
      onClose();
    } catch (e) { setError(e.response?.data?.message || 'Termination failed. Agent holds active ledger associations.'); setLoading(false); }
  };

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
        {field('Name',   name,  setName)}
        {field('Phone',  phone, setPhone)}
        {field('Role',   role,  setRole, { options:[
                  { value:'AGENT', label:'Field Agent' },
                  ...(user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' ? [
                    { value:'MANAGER', label:'Branch Manager' },
                    { value:'ADMIN', label:'System Admin' }
                  ] : [])
                ]})}
        {field('Branch', branchId, setBranch, { options:[
          { value:'', label:'— HQ / Unassigned —' },
          ...branches.map(b => ({ value: String(b.id), label: b.name })),
        ]})}

        <div style={{ gridColumn: 'span 2', height: 1, background: G.border, margin: '16px 0' }} />
        <h4 style={{ gridColumn: 'span 2', fontSize: 11, color: G.textSub, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12, fontWeight: 700 }}>Compensation & Identity</h4>
        
        {field('Commission Rate (%)', commissionRate, setCommissionRate, { type:'number', placeholder:'e.g. 2.5' })}
        {field('Base Salary (₹)', baseSalary, setBaseSalary, { type:'number', placeholder:'e.g. 15000' })}
        {field('PAN Card Number', panNumber, setPanNumber, { placeholder:'10 characters' })}
        {field('Aadhaar Card Number', aadhaarNumber, setAadhaarNumber, { placeholder:'12 digits' })}
        {field('Date of Birth', dateOfBirth, setDateOfBirth, { type:'date' })}
        {field('Date of Joining', dateOfJoining, setDateOfJoining, { type:'date' })}

        <div style={{ gridColumn: 'span 2', height: 1, background: G.border, margin: '16px 0' }} />
        <h4 style={{ gridColumn: 'span 2', fontSize: 11, color: G.textSub, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12, fontWeight: 700 }}>Bank Account Details</h4>

        {field('Bank Name', bankName, setBankName, { placeholder:'e.g. ICICI Bank' })}
        {field('Account Number', bankAccountNumber, setBankAccountNumber, { placeholder:'Bank account number' })}
        {field('IFSC Code', bankIfscCode, setBankIfscCode, { placeholder:'e.g. ICIC0000123' })}
        <div style={{ gridColumn: 'span 2', height: 12 }} />
      </div>
      <button className="btn-primary" style={{ width:'100%', marginBottom:24, padding: '16px' }} onClick={saveDetails} disabled={loading}>
        {loading ? 'Committing Changes…' : 'Commit Configuration Changes'}
      </button>

      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize:12, color:G.text, fontWeight: 700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:12 }}>Reset Credentials</div>
        <div style={{ display:'flex', gap:12 }}>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New secure password" style={{ flex:1 }} />
          <button className="btn-warn" onClick={resetPass} disabled={loading}>Force Reset</button>
        </div>
      </div>

      {agent.role === 'AGENT' && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize:12, color:G.text, fontWeight: 700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:12 }}>Device Security Binding</div>
          
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize:13, color:G.textSub }}>
              {agent.registeredDeviceId ? `Bound: ${agent.registeredDeviceId.substring(0, 18)}...` : 'No device currently bound.'}
            </span>
            <button className="btn-warn" style={{ padding: '8px 16px' }} onClick={async () => {
              if (window.confirm(`Unbind app for agent ${agent.name}? They will need to verify via mobile OTP on next login.`)) {
                setLoading(true); setError(''); setSuccess('');
                try {
                  await axios.patch(`http://localhost:8085/api/users/${agent.id}/reset-device`, {}, authH);
                  setSuccess('Device security binding cleared successfully.');
                  setManualDevice('');
                  await onSuccess();
                } catch (e) {
                  setError(e.response?.data?.message || 'Unbind failed.');
                } finally {
                  setLoading(false);
                }
              }
            }} disabled={loading || !agent.registeredDeviceId}>
              Clear Bind
            </button>
          </div>

          {/* Pending Device Connection Requests */}
          {agent.pendingDeviceId ? (
            <div style={{ border: `1px solid ${G.accent}44`, background: `rgba(0, 255, 136, 0.05)`, padding: 12, borderRadius: 4, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.accent, textTransform: 'uppercase', marginBottom: 4 }}>Pending Device Connection Request</div>
              <div style={{ fontSize: 13, color: G.text, marginBottom: 8, wordBreak: 'break-all' }}>
                <strong>Device:</strong> {agent.pendingDeviceId}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070D1F', padding: 10, borderRadius: 4, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: G.textSub }}>VERIFICATION CODE:</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: G.accent, letterSpacing: '2px' }}>{agent.mobileVerificationOtp || 'N/A'}</div>
                </div>
                <div style={{ fontSize: 11, color: G.textSub, textAlign: 'right' }}>
                  Expires: {agent.mobileVerificationOtpExpiresAt ? new Date(agent.mobileVerificationOtpExpiresAt).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleApproveDevice} disabled={loading}>
                Approve & Bind Device (Bypass OTP)
              </button>
            </div>
          ) : (
            <div style={{ border: `1px dashed ${G.border}`, padding: 12, borderRadius: 4, fontSize: 12, color: G.textSub, lineHeight: 1.5, background: 'rgba(255,255,255,0.01)', marginBottom: 16 }}>
              <strong style={{ color: G.warn, display: 'block', marginBottom: 4 }}>💡 Twilio OTP Bypass Instructions:</strong>
              To authorize a new device or view a verification OTP here, the field agent must first attempt a login using their email and password on the mobile app. This will automatically generate a pending connection request and display the OTP/approval button here.
            </div>
          )}

          {/* Manual Device Override */}
          <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 16, marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.textSub, textTransform: 'uppercase', marginBottom: 8 }}>Manual Device Override</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" value={manualDevice} onChange={e => setManualDevice(e.target.value)} placeholder="Enter Device ID manually" style={{ flex: 1, fontSize: 12 }} />
              <button className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handleManualDeviceBind} disabled={loading}>
                Force Bind
              </button>
            </div>
          </div>
        </div>
      )}

      {error   && <div style={{ background: 'rgba(255, 71, 87, 0.1)', border: `1px solid ${G.danger}33`, color: G.danger, borderRadius:4, padding:'12px 16px', fontSize:13, marginBottom:16, fontWeight:500 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: `1px solid ${G.accent}33`, color: G.accent, borderRadius:4, padding:'12px 16px', fontSize:13, marginBottom:16, fontWeight:500 }}>{success}</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${G.border}`, paddingTop:20 }}>
        <button className="btn-danger" onClick={deleteUser} disabled={loading}>Terminate Access</button>
        <button className="btn-ghost" onClick={onClose}>Close Window</button>
      </div>
    </div>
  );
}

function CustomerProfileModal({ customer, token, onSuccess, onClose: _onClose }) {
  const [tab, setTab] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aadhar, setAadhar] = useState(customer.aadharNumber || '');
  const [pan, setPan] = useState(customer.panNumber || '');
  const [address, setAddress] = useState(customer.residentialAddress || '');
  const [gName, setGName] = useState(customer.guarantorName || '');
  const [gPhone, setGPhone] = useState(customer.guarantorPhoneNumber || '');
  const [custName, setCustName] = useState(customer.name || '');
  const [custPhone, setCustPhone] = useState(customer.phoneNumber || '');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [tenureMonths, setTenureMonths] = useState('12');
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`http://localhost:8085/api/loans/customer/${customer.id}`, authH);
      setLoans(Array.isArray(res.data) ? res.data : []);
    } catch (_e) { console.error("Loans missing/403"); } finally { setLoading(false); }
  };

  useEffect(() => { Promise.resolve().then(() => fetchLoans()); }, []);

  const saveKyc = async () => {
    setLoading(true);
    try {
      await axios.put(`http://localhost:8085/api/customers/${customer.id}/kyc`, {
        name: custName, phoneNumber: custPhone,
        aadharNumber: aadhar, panNumber: pan, residentialAddress: address, guarantorName: gName, guarantorPhoneNumber: gPhone
      }, authH);
      alert('KYC Ledger Updated Successfully.');
      onSuccess();
    } catch (_e) { alert('KYC Update Failed'); } finally { setLoading(false); }
  };

  const issueLoan = async () => {
    if (!principal || principal <= 0) return alert('Enter a valid principal amount.');
    setLoading(true);
    try {
      await axios.post(`http://localhost:8085/api/loans/issue/${customer.id}`, {
        principalAmount: parseFloat(principal), interestRate: parseFloat(interestRate), tenureMonths: parseInt(tenureMonths)
      }, authH);
      setPrincipal('');
      await fetchLoans();
      onSuccess();
    } catch (_e) { alert('Failed to provision loan.'); } finally { setLoading(false); }
  };

  const pAmt = parseFloat(principal) || 0;
  const iRate = parseFloat(interestRate) || 0;
  const tMonths = parseInt(tenureMonths) || 12;
  const calcInterest = pAmt * (iRate / 100);
  const calcTotal = pAmt + calcInterest;
  const calcMonthly = Math.ceil(calcTotal / tMonths);

  return (
    <div>
      <div style={{ display:'flex', gap:20, alignItems:'center', paddingBottom:24, borderBottom:`1px solid ${G.border}`, marginBottom:24 }}>
        <div style={{ width:56, height:56, borderRadius:4, background:G.sidebar.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:G.accent, fontFamily:'var(--font-display)' }}>
          {initials(customer.name)}
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:G.text, fontFamily:'var(--font-display)', marginBottom:4 }}>{customer.name}</div>
          <div style={{ fontSize:13, color:G.textSub, fontWeight:500, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              A/C: <span style={{ color: G.text, fontFamily: 'monospace' }}>{customer.accountNumber}</span> &nbsp;·&nbsp;
              <span className={customer.kycStatus === 'VERIFIED' ? 'tag tag-green' : 'tag tag-amber'}>{customer.kycStatus || 'PENDING KYC'}</span>
            </div>
            <div style={{ fontSize:12, color:G.textSub, fontWeight:500 }}>
              {customer.assignedAgent ? (
                <span style={{ color: G.accent }}>👤 Assigned Agent: <strong>{customer.assignedAgent.name}</strong></span>
              ) : (
                <span style={{ color: G.warn }}>👤 Agent: <strong>Unassigned</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        <button onClick={()=>setTab('loans')} className={tab === 'loans' ? 'btn-primary' : 'btn-ghost'} style={{flex:1, borderRadius: 4}}>Credit Facilities</button>
        <button onClick={()=>setTab('kyc')} className={tab === 'kyc' ? 'btn-primary' : 'btn-ghost'} style={{flex:1, borderRadius: 4}}>KYC Dossier</button>
      </div>

      {tab === 'loans' && (
        <div className="fade-up">
          <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:4, padding:24, marginBottom:24 }}>
            <h4 style={{ fontSize:13, color:G.text, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16, fontWeight: 700 }}>Originate Facility</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 20px' }}>
              {field('Principal Amount (₹)', principal, setPrincipal, { type: 'number', placeholder: 'e.g. 10000' })}
              {field('Flat Interest Rate (%)', interestRate, setInterestRate, { type: 'number' })}
              {field('Tenure (Months)', tenureMonths, setTenureMonths, { type: 'number', placeholder: 'e.g. 12' })}
            </div>
            {pAmt > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', background:G.surface, padding:'16px 20px', borderRadius:4, border:`1px solid ${G.border}`, marginBottom:20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div><div style={{ fontSize:11, color:G.textSub, fontWeight:600, textTransform:'uppercase' }}>Total Maturation Due</div><div style={{ color:G.warn, fontWeight:700, fontSize: 16 }}>{fmtR(calcTotal)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize:11, color:G.textSub, fontWeight:600, textTransform:'uppercase' }}>Target Monthly EMI</div><div style={{ color:G.info, fontWeight:700, fontSize: 16 }}>{fmtR(calcMonthly)}</div></div>
              </div>
            )}
            <button className="btn-primary" style={{ width:'100%', padding: '16px' }} onClick={issueLoan} disabled={loading || pAmt <= 0}>
              {loading ? 'Processing...' : 'Authorize Origination'}
            </button>
          </div>

          <h4 style={{ fontSize:13, color:G.text, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16, fontWeight: 700 }}>Active & Historical Facilities</h4>
          {loans.length === 0 ? <p style={{ fontSize:14, color:G.muted, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No credit history found on ledger.</p> : loans.map(l => (
            <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:G.surface, padding:'16px 20px', borderRadius:4, border:`1px solid ${G.border}`, marginBottom:12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ fontSize:16, color:G.text, fontWeight:700, fontFamily: 'var(--font-display)' }}>{fmtR(l.principalAmount)} <span style={{ fontSize:13, color:G.textSub, fontFamily: 'var(--font-mono)', fontWeight:500 }}>@ {l.interestRate}%</span></div>
                <div style={{ fontSize:12, color:G.textSub, marginTop:6, fontWeight: 500 }}>Recovered: <span style={{color: G.text}}>{fmtR(l.amountPaid)}</span> / {fmtR(l.totalAmountDue)}</div>
              </div>
              <span className={l.status === 'ACTIVE' ? 'tag tag-green' : 'tag tag-amber'}>{l.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'kyc' && (
        <div className="fade-up">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            {field('Customer Name', custName, setCustName, { placeholder: 'Full Legal Name' })}
            {field('Phone Number', custPhone, setCustPhone, { placeholder: 'Contact Number' })}
            {field('Aadhar Number', aadhar, setAadhar, { placeholder: '12-digit UIDAI' })}
            {field('PAN Card', pan, setPan, { placeholder: '10-char Alphanumeric' })}
            <div style={{ gridColumn:'1 / -1' }}>{field('Registered Address', address, setAddress, { placeholder: 'Full documented address' })}</div>

            <div style={{ gridColumn:'1 / -1', borderTop:`1px solid ${G.border}`, paddingTop:20, marginTop:12, fontSize:13, color:G.text, fontWeight:700, letterSpacing: '1px' }}>GUARANTOR PROTOCOL</div>
            {field('Guarantor Name', gName, setGName)}
            {field('Guarantor Phone', gPhone, setGPhone)}
          </div>
          <button className="btn-primary" style={{ width:'100%', marginTop:16, padding: '16px' }} onClick={saveKyc} disabled={loading}>
            {loading ? 'Committing to Ledger...' : 'Commit KYC to Ledger'}
          </button>
        </div>
      )}
    </div>
  );
}

const LogisticsMap = ({ selectedRoute, selectedAgent, customers, authH: _authH, onCoordinatesUpdate }) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    if (!selectedRoute && !selectedAgent) return;

    const routeCusts = customers.filter(c => {
      if (selectedRoute) return c.route?.id === selectedRoute.id && c.latitude && c.longitude;
      if (selectedAgent) return c.assignedAgent?.id === selectedAgent.id && c.latitude && c.longitude;
      return false;
    }).sort((a,b) => (a.routeSequence||0) - (b.routeSequence||0));

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    let center = [15.3647, 75.1240];
    if (routeCusts.length > 0) {
      center = [routeCusts[0].latitude, routeCusts[0].longitude];
    }

    const map = window.L.map(mapRef.current).setView(center, 13);
    leafletMapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const latlngs = [];
    const markers = [];

    routeCusts.forEach((c) => {
      const latlng = [c.latitude, c.longitude];
      latlngs.push(latlng);

      const marker = window.L.marker(latlng)
        .addTo(map)
        .bindPopup(`<b>${c.name}</b><br>Seq: ${c.routeSequence}<br>${c.residentialAddress || ''}`);
      markers.push(marker);
    });

    if (latlngs.length > 1) {
      window.L.polyline(latlngs, { color: '#D4AF37', weight: 4 }).addTo(map);
    }

    if (latlngs.length > 0) {
      const group = new window.L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const customerName = window.prompt(`Update coordinates at clicked location (${lat.toFixed(5)}, ${lng.toFixed(5)})?\nEnter customer Name or ID to assign:`);
      if (customerName) {
        const cust = customers.find(c => {
          if (selectedRoute) return c.route?.id === selectedRoute.id && c.name.toLowerCase().includes(customerName.toLowerCase());
          if (selectedAgent) return c.assignedAgent?.id === selectedAgent.id && c.name.toLowerCase().includes(customerName.toLowerCase());
          return false;
        });
        if (cust) {
          onCoordinatesUpdate(cust.id, lat, lng);
        } else {
          alert("Customer not found.");
        }
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [selectedRoute, selectedAgent, customers, onCoordinatesUpdate]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Route Sequence Map</span>
        <span style={{ fontSize: 11, color: '#7F8C8D' }}>Tip: Click map to pin coordinates for a customer</span>
      </div>
      <div ref={mapRef} style={{ height: 260, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F3F4F6', zIndex: 1 }} />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard({ user, handleLogout }) {
  const [agents, setAgents]       = useState([]);
  const [branches, setBranches]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activity, setActivity]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [pendingCash, setPendingCash] = useState({});
  const [routes, setRoutes] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [logisticsView, setLogisticsView] = useState('routes'); // 'routes' or 'agents'
  const [selectedAgentForLogistics, setSelectedAgentForLogistics] = useState(null);
  const [localSequenceOrder, setLocalSequenceOrder] = useState(null);
  const [draggedAgentIdx, setDraggedAgentIdx] = useState(null);

  const agentCustomers = useMemo(() => {
    if (!selectedAgentForLogistics) return [];
    const filtered = customers.filter(c => c.assignedAgent?.id === selectedAgentForLogistics.id);
    if (localSequenceOrder) {
      const idToIndex = new Map(localSequenceOrder.map((id, idx) => [id, idx]));
      return [...filtered].sort((a, b) => {
        const idxA = idToIndex.has(a.id) ? idToIndex.get(a.id) : 999;
        const idxB = idToIndex.has(b.id) ? idToIndex.get(b.id) : 999;
        return idxA - idxB;
      });
    }
    return [...filtered].sort((a, b) => (a.routeSequence || 999) - (b.routeSequence || 999));
  }, [customers, selectedAgentForLogistics, localSequenceOrder]);
  const [auditLogs, setAuditLogs]         = useState([]);

  const [tab, setTab]             = useState('overview');
  const [clock, setClock]         = useState(new Date());
  const [search, setSearch]             = useState('');
  const [custSearch, setCustSearch]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('ALL');
  const [showAddAgent, setShowAddAgent]   = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editAgent, setEditAgent]         = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const [perfMode, setPerfMode]   = useState('overall');
  const [perfAgent, setPerfAgent] = useState('');
  const [perfYear, setPerfYear]   = useState(new Date().getFullYear());
  const [perfMonth, setPerfMonth] = useState(new Date().getMonth() + 1);
  const [perfTxns, setPerfTxns]   = useState([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [riskFilter, setRiskFilter]   = useState('ALL');

  const token = user?.token;
  const tenantId = user?.tenantId ?? 1;
  const authH = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const ts = Date.now();

    const extractArray = (res) => {
      if (!res || !res.data) return [];
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
      if (Array.isArray(res.data.users)) return res.data.users;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    };

    try { const settleRes = await axios.get(`http://localhost:8085/api/settlements/pending/${tenantId}?t=${ts}`, authH); setPendingCash(settleRes.data || {}); } catch(_e) { /* non-critical */ }
    try {
      const routesRes = await axios.get(`http://localhost:8085/api/routes?t=${ts}`, authH);
      const updatedRoutes = extractArray(routesRes);
      setRoutes(updatedRoutes);
      if (selectedRoute) {
        const refreshed = updatedRoutes.find(r => r.id === selectedRoute.id);
        if (refreshed) setSelectedRoute(refreshed);
      }
    } catch (_e) { /* non-critical */ }
    try { const loansRes = await axios.get(`http://localhost:8085/api/loans/pending?t=${ts}`, authH); setPendingLoans(extractArray(loansRes)); } catch(_e) { /* non-critical */ }

    try {
      const [agentsRes, branchesRes] = await Promise.all([
        axios.get(`http://localhost:8085/api/users/tenant/${tenantId}?t=${ts}`, authH),
        axios.get(`http://localhost:8085/api/branches/tenant/${tenantId}?t=${ts}`, authH),
      ]);

      const agentList = extractArray(agentsRes);
      const branchList = extractArray(branchesRes);
      setAgents(agentList);
      setBranches(branchList);

      let customerList = [];
      try {
        let custEndpoint = `http://localhost:8085/api/customers/tenant/${tenantId}?t=${ts}`;
        if (user?.role === 'MANAGER' || user?.role === 'REGIONAL_MANAGER') custEndpoint = `http://localhost:8085/api/customers/my-branch?t=${ts}`;
        else if (user?.role === 'AGENT') custEndpoint = `http://localhost:8085/api/customers/agent/${user?.id}?t=${ts}`;

        const custRes = await axios.get(custEndpoint, authH);
        customerList = extractArray(custRes);
        setCustomers(customerList);
      } catch (_e) { /* non-critical */ }

      try {
        const txRes = await axios.get(`http://localhost:8085/api/transactions/recent/${tenantId}?t=${ts}`, authH);
        setActivity(extractArray(txRes));
      } catch (_e) { /* non-critical */ }

      try {
        const statsRes = await axios.get(`http://localhost:8085/api/stats/tenant/${tenantId}?t=${ts}`, authH);
        setStats(statsRes.data);
      } catch (_e) {
        setStats({ agentCount: agentList.filter(a => a.role === 'AGENT').length, managerCount: agentList.filter(a => a.role === 'MANAGER').length, branchCount: branchList.length, customerCount: customerList.length, todayCollection: 0, totalPortfolio: 0 });
      }

      try {
        if (user?.role === 'ADMIN') {
          const auditRes = await axios.get(`http://localhost:8085/api/audit-logs/tenant/${tenantId}?t=${ts}`, authH);
          setAuditLogs(extractArray(auditRes));
        }
      } catch (_e) { /* non-critical */ }

    } catch (e) { console.error("Critical API Failure", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { Promise.resolve().then(() => fetchAll()); }, []);

  // Derived agentCustomers dynamically via useMemo to avoid setState inside effect

  const handleRecalculateRisk = async () => {
    try {
      setLoading(true);
      await axios.post('http://localhost:8085/api/customers/recalculate-risk', {}, authH);
      alert('Risk scores recalculated successfully!');
      fetchAll();
    } catch (e) {
      console.error(e);
      alert('Failed to recalculate risk: ' + (e.response?.data || e.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = useCallback(async () => {
    if (tab !== 'performance') return;
    await Promise.resolve();
    setPerfLoading(true);
    try {
      let url = `http://localhost:8085/api/transactions/tenant/${tenantId}/performance?year=${perfYear}&month=${perfMonth}`;
      if (perfMode === 'agent') {
        if (!perfAgent) {
          setPerfTxns([]);
          setPerfLoading(false);
          return;
        }
        url = `http://localhost:8085/api/transactions/agent/${perfAgent}/performance?year=${perfYear}&month=${perfMonth}`;
      }
      const res = await axios.get(url, authH);
      setPerfTxns(res.data || []);
    } catch (e) {
      console.error(e);
      setPerfTxns([]);
    } finally {
      setPerfLoading(false);
    }
  }, [tab, perfMode, perfAgent, perfYear, perfMonth, tenantId, authH]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPerformance();
    });
  }, [fetchPerformance]);

  useEffect(() => {
    if (perfMode === 'agent' && !perfAgent && agents.length > 0) {
      const firstAgent = agents.find(a => a.role === 'AGENT');
      if (firstAgent) {
        const id = firstAgent.id;
        Promise.resolve().then(() => {
          setPerfAgent(id);
        });
      }
    }
  }, [perfMode, perfAgent, agents]);

  const addBranch = async () => {
    if (!branchName) return;
    try {
      await axios.post('http://localhost:8085/api/branches', { 
        name: branchName, 
        city: branchCity, 
        branchCode: branchCode,
        address: branchAddress,
        tenant: { id: tenantId } 
      }, authH);
      setBranchName(''); setBranchCity(''); setBranchCode(''); setBranchAddress(''); setShowAddBranch(false); fetchAll();
    } catch (e) { alert(e.response?.data || 'Failed'); }
  };

  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    if (tab === 'logistics' && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    } else if (tab === 'logistics') {
      Promise.resolve().then(() => setLeafletLoaded(true));
    }
  }, [tab]);

  const handleCoordinatesUpdate = async (customerId, latitude, longitude) => {
    try {
      await axios.put(`http://localhost:8085/api/customers/${customerId}/coordinates?latitude=${latitude}&longitude=${longitude}`, {}, authH);
      fetchAll();
    } catch (e) {
      alert("Failed to update coordinates: " + (e.response?.data || e.message));
    }
  };

  const filteredAgents = agents.filter(a => {
    const q = search.toLowerCase();
    const mQ = !q || a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
    const mR = roleFilter === 'ALL' || a.role === roleFilter;
    return mQ && mR;
  });

  const filteredCustomers = customers.filter(c => {
    const mSearch = !custSearch || c.name?.toLowerCase().includes(custSearch.toLowerCase()) || c.accountNumber?.includes(custSearch);
    const mRisk = riskFilter === 'ALL' || c.riskStatus === riskFilter;
    return mSearch && mRisk;
  });

  const SPARK = [42,38,55,61,48,72,68,80,75,90,88,95];
  const hour  = clock.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const TABS = [
    { id:'overview',   label:'Corporate Overview',   icon:'◈', roles: ['ADMIN', 'MANAGER'] },
    { id:'sync',       label:'Bank Integration',     icon:'🔄', roles: ['ADMIN', 'MANAGER'] },
    { id:'settlements',label:'Vault Settlements',    icon:'🤝', roles: ['ADMIN', 'MANAGER'] },
    { id:'performance',label:'Performance & Payroll',icon:'💰', roles: ['ADMIN', 'MANAGER'] },
    { id:'logistics',  label:'Logistics Engine',     icon:'🗺️', roles: ['ADMIN', 'MANAGER'] },
    { id:'customers',  label:'Client Registry',      icon:'◎', roles: ['ADMIN', 'MANAGER'] },
    { id:'agents',     label:'Access Management',    icon:'◉', roles: ['ADMIN', 'MANAGER'] },
    { id:'approvals',  label:'Authorizations',       icon:'📝', roles: ['ADMIN'] },
    { id:'branches',   label:'Branch Network',       icon:'◧', roles: ['ADMIN'] },
    { id:'analytics',  label:'Intelligence',         icon:'◫', roles: ['ADMIN'] },
    { id:'audit',       label:'Security Audit',       icon:'🛡️', roles: ['ADMIN'] },
  ].filter(t => t.roles.includes(user?.role));

  return (
    <>
      <style>{STYLE}</style>
      <TickerBar stats={stats} />

      <div style={{ display:'flex', height:'calc(100vh - 40px)', overflow:'hidden' }}>

        {/* ── Sidebar (Navy/Gold Theme) ── */}
        <aside style={{ width:260, flexShrink:0, background:G.sidebar.bg, borderRight:`1px solid ${G.sidebar.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'28px 24px 24px', borderBottom:`1px solid ${G.sidebar.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:4, background:G.accentBg, border:`1px solid ${G.accent}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color: G.accent, fontFamily: 'var(--font-display)' }}>P</div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:G.sidebar.text, letterSpacing:'0.5px' }}>Pigmy<span style={{color: G.accent, fontStyle: 'italic'}}>Pay</span></div>
                <div style={{ fontSize:10, color:G.sidebar.textSub, letterSpacing:'.1em', fontWeight: 600 }}>INSTITUTIONAL</div>
              </div>
            </div>
          </div>

          <nav style={{ padding:'16px 12px', flex:1, overflowY: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'12px 16px', borderRadius:4, marginBottom:4,
                background: tab === t.id ? G.accentBg : 'transparent',
                borderLeft: tab === t.id ? `3px solid ${G.accent}` : '3px solid transparent',
                color: tab === t.id ? G.accent : G.sidebar.textSub,
                fontSize:13, fontWeight: 500, textAlign:'left', cursor:'pointer', transition:'all .2s',
              }}
              onMouseEnter={e => { if(tab !== t.id) e.currentTarget.style.color = G.sidebar.text; }}
              onMouseLeave={e => { if(tab !== t.id) e.currentTarget.style.color = G.sidebar.textSub; }}>
                <span style={{ fontSize:16, opacity:.9 }}>{t.icon}</span>
                {t.label}
                {t.id === 'customers' && customers.length > 0 && (
                  <span style={{ marginLeft:'auto', background:G.accentBg, color:G.accent, fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight: 700 }}>{customers.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div style={{ padding:'20px 24px', background:'#070D1F', borderTop:`1px solid ${G.sidebar.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:4, background:G.accentBg, border:`1px solid ${G.accent}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:G.accent, fontFamily:'var(--font-display)' }}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:G.sidebar.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize:11, color:G.accent, fontWeight: 500 }}>{user?.role}</div>
                {user?.tenantName && (
                  <div style={{ fontSize:10, color:G.sidebar.textSub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>
                    🏢 {user.tenantName}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize:11, color:G.sidebar.textSub, marginBottom:16, letterSpacing:'.05em', fontWeight: 500 }}>
              {clock.toLocaleTimeString('en-IN', { hour12:false })} IST
            </div>
            <button className="btn-ghost" style={{ width:'100%', fontSize:12, padding:'10px', borderColor: G.sidebar.border, color: G.sidebar.textSub }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E53E3E'; e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#E53E3E'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.sidebar.textSub; e.currentTarget.style.borderColor = G.sidebar.border; }}
              onClick={handleLogout}>Terminate Session</button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex:1, overflowY:'auto', padding:'40px 48px' }}>

          {/* ════════════════════════════════════════════════════════════
              TAB: SYNC
              ════════════════════════════════════════════════════════════ */}
          {tab === 'sync' && (
            <SyncTab token={token} tenantId={tenantId} authH={authH} onSyncSuccess={fetchAll} />
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: OVERVIEW
              ════════════════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div>
              <div className="fade-up" style={{ marginBottom:36 }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>
                  Good {greeting}, {(user?.name || 'Admin').split(' ')[0]}.
                </h1>
                <p style={{ color:G.textSub, fontSize:14, marginTop:8, fontWeight: 500 }}>
                  {clock.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} — System Liquidity Overview
                </p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:20, marginBottom:36 }}>
                <StatCard label="Total Portfolio"    value={stats?.totalPortfolio ?? 0} prefix="₹" sub="Cumulative Managed Assets"  spark={SPARK.map(v=>v*.85)} color={G.text} icon="🏦" delay={1}/>
                <StatCard label="Today's Liquidity" value={stats?.todayCollection??0} prefix="₹" sub={`${stats?.todayTxnCount??0} Cleared Transactions`} spark={SPARK.map(v=>v*.9)} color={G.accent} icon="⚖️" delay={2}/>
                <StatCard label="Client Base"    value={stats?.customerCount ?? customers.length} sub="Active Accounts"  spark={SPARK.map(v=>v*.8)}  color={G.info}    icon="👥" delay={3} />
                <StatCard label="Field Operatives"       value={stats?.agentCount    ?? agents.filter(a=>a.role==='AGENT').length} sub="Dispatched Agents"   spark={SPARK}               color={G.purple}  icon="🚶" delay={4} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24 }}>
                <div className="fade-up-3" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding:'20px 24px', borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background: G.surface }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color: G.text }}>Identity Management</div>
                      <div style={{ fontSize:12, color:G.textSub, marginTop:4, fontWeight: 500 }}>Recent Personnel Authorizations</div>
                    </div>
                    <button className="btn-primary" style={{ padding:'10px 16px', fontSize: 12 }} onClick={() => setShowAddAgent(true)}>Provision User</button>
                  </div>
                  {loading
                    ? <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:56, marginBottom:12 }}/>)}</div>
                    : agents.length === 0
                      ? <div style={{ padding:60, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>No users provisioned.</div>
                      : agents.slice(0,5).map((a,i) => (
                          <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:`1px solid ${G.border}` }}>
                            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                              <div style={{ width:40, height:40, borderRadius:4, background:`${colors[i%colors.length]}15`, color:colors[i%colors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily: 'var(--font-display)' }}>{initials(a.name)}</div>
                              <div><div style={{ fontSize:14, color:G.text, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize:12, color:G.textSub, marginTop: 2 }}>{a.role}</div></div>
                            </div>
                            <button className="btn-ghost" style={{ padding:'6px 14px', fontSize:11 }} onClick={() => setEditAgent(a)}>Inspect</button>
                          </div>
                        ))
                  }
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div className="fade-up-4" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:20, color: G.text }}>Rapid Directives</div>
                    {[
                      { label:'Provision Field Agent',  icon:'👤', color:G.info,  action:() => setShowAddAgent(true)  },
                      { label:'Establish Branch',    icon:'🏢', color:G.purple,    action:() => setShowAddBranch(true) },
                      { label:'Inspect Ledger',   icon:'🧾', color:G.accentDim,  action:() => setTab('customers')    },
                      { label:'Financial Intelligence',   icon:'📊', color:G.text,    action:() => setTab('analytics')    },
                    ].map(q => (
                      <button key={q.label} onClick={q.action} style={{ display:'flex', alignItems:'center', gap:12, background: G.surface, border:`1px solid ${G.border}`, borderRadius:4, padding:'14px 16px', color:G.text, fontSize:13, fontWeight: 600, cursor:'pointer', transition:'all .2s', textAlign:'left', width:'100%', marginBottom:10 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=q.color; e.currentTarget.style.boxShadow=`0 4px 12px ${q.color}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=G.border; e.currentTarget.style.boxShadow='none'; }}>
                        <span style={{ fontSize:16 }}>{q.icon}</span>{q.label}
                        <span style={{ marginLeft:'auto', color:G.muted, fontSize:16 }}>→</span>
                      </button>
                    ))}
                  </div>

                  <div className="fade-up-5" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, flex:1, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:20, color: G.text }}>Transaction Telemetry</div>
                    {activity.length > 0 ? activity.map((t,i) => (
                      <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:`1px solid ${G.border}` }}>
                        <div style={{ width:32, height:32, borderRadius:4, flexShrink:0, background:`${G.accent}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>💳</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:G.text, fontWeight: 600 }}>{t.customer?.name || 'Customer'} — <span style={{ color:G.accentDim }}>{fmtR(t.amount)}</span></div>
                          <div style={{ fontSize:11, color:G.textSub, marginTop:4, fontWeight: 500 }}>{t.agent?.name || 'Agent'} · {t.paymentMode || 'CASH'}</div>
                        </div>
                        <div style={{ fontSize:11, color:G.muted, flexShrink:0, fontWeight: 500 }}>
                          {new Date(t.transactionDate).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: 20, textAlign: 'center', color: G.muted, fontSize: 13, fontStyle: 'italic', background: G.surface, borderRadius: 4 }}>
                        Awaiting network telemetry.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: SETTLEMENTS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'settlements' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Vault Settlements</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>Audit and verify physical liquidity handed over by field operatives.</p>
                </div>
              </div>

              <div className="fade-up-1" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px,1fr))', gap:24 }}>
                {Object.keys(pendingCash).length === 0 ? (
                  <div style={{ gridColumn:'1/-1', padding:80, textAlign:'center', background:G.card, border:`1px dashed ${G.borderHi}`, borderRadius:G.rLg, color:G.muted, fontSize:14, fontStyle: 'italic' }}>
                    Ledgers balanced. No unverified cash currently in transit.
                  </div>
                ) : (
                  Object.entries(pendingCash).map(([agentKey, data]) => {
                    const [agentName, agentId] = agentKey.split('|');
                    return (
                      <div key={agentId} style={{ background:G.card, border:`1px solid ${G.warn}44`, borderRadius:G.rLg, padding:28, position:'relative', overflow:'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${G.warn},${G.warn}44)` }}/>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                          <div>
                            <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:G.text, marginBottom: 4 }}>{agentName}</div>
                            <div style={{ fontSize:12, color:G.textSub, fontFamily: 'monospace' }}>Operative ID: {agentId}</div>
                          </div>
                          <span className="tag tag-amber">UNVERIFIED TRANSIT</span>
                        </div>
                        <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:4, padding:20, marginBottom:24 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, alignItems: 'center' }}>
                            <span style={{ fontSize:12, color:G.textSub, fontWeight: 600, textTransform: 'uppercase' }}>Physical Cash Due</span>
                            <span style={{ fontSize:24, fontWeight:700, color:G.warn, fontFamily:'var(--font-display)' }}>{fmtR(data.totalCash)}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
                            <span style={{ fontSize:12, color:G.textSub, fontWeight: 500 }}>Cleared Receipts</span>
                            <span style={{ fontSize:13, color:G.text, fontWeight: 600 }}>{data.transactionCount} Txns</span>
                          </div>
                        </div>
                        <button
                          className="btn-primary"
                          style={{ width:'100%', background: G.text, color: G.surface, padding: '16px' }}
                          onClick={async () => {
                            if(window.confirm(`AUTHORIZATION REQUIRED: Verify physical receipt of exactly ${fmtR(data.totalCash)} from ${agentName}?`)) {
                              try {
                                await axios.post(`http://localhost:8085/api/settlements/confirm/${agentId}`, {}, authH);
                                fetchAll();
                              } catch (_e) {
                                alert("Settlement protocol failed. Verify network connection.");
                              }
                            }
                          }}
                        >
                          Verify & Commit to Vault
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: PERFORMANCE & PAYROLL
              ════════════════════════════════════════════════════════════ */}
          {tab === 'performance' && (() => {
            // In-render calculations for performance metrics
            const filteredTxns = perfTxns.filter(tx => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                tx.customerName?.toLowerCase().includes(q) ||
                tx.customerAccountNumber?.includes(q) ||
                tx.agentName?.toLowerCase().includes(q) ||
                tx.category?.toLowerCase().includes(q)
              );
            });

            let totalAmount = 0;
            let totalCash = 0;
            let totalUpi = 0;
            let totalCollectedCount = 0;
            let totalSkippedCount = 0;

            perfTxns.forEach(tx => {
              if (tx.isReversed) return;
              const isSkip = tx.category && (tx.category.startsWith('SKIPPED') || tx.category === 'CLOSURE_REQUESTED');
              if (isSkip) {
                totalSkippedCount++;
              } else {
                totalCollectedCount++;
                const amt = parseFloat(tx.amount || 0);
                totalAmount += amt;
                if (tx.paymentMode === 'CASH') totalCash += amt;
                if (tx.paymentMode === 'UPI') totalUpi += amt;
              }
            });

            // Group by Day (YYYY-MM-DD)
            const dailyGroup = {};
            perfTxns.forEach(tx => {
              if (tx.isReversed) return;
              const dateStr = tx.transactionDate ? tx.transactionDate.split('T')[0] : 'UnknownDate';
              if (!dailyGroup[dateStr]) {
                dailyGroup[dateStr] = {
                  date: dateStr,
                  amount: 0,
                  cash: 0,
                  upi: 0,
                  collected: 0,
                  skipped: 0
                };
              }
              const isSkip = tx.category && (tx.category.startsWith('SKIPPED') || tx.category === 'CLOSURE_REQUESTED');
              if (isSkip) {
                dailyGroup[dateStr].skipped++;
              } else {
                dailyGroup[dateStr].collected++;
                const amt = parseFloat(tx.amount || 0);
                dailyGroup[dateStr].amount += amt;
                if (tx.paymentMode === 'CASH') dailyGroup[dateStr].cash += amt;
                if (tx.paymentMode === 'UPI') dailyGroup[dateStr].upi += amt;
              }
            });

            const dailyList = Object.values(dailyGroup).sort((a, b) => b.date.localeCompare(a.date));

            const handleCSVExport = (mode) => {
              let csvRows = [];
              let fileName = "";
              
              if (mode === 'summary') {
                fileName = `${perfMode}_performance_summary_${perfYear}_${perfMonth}.csv`;
                csvRows.push(["Date", "Total Collected", "Cash Amount", "UPI Amount", "Collected Visits", "Skipped Visits", "Est Commission (1.5%)"]);
                dailyList.forEach(d => {
                  const comm = (d.amount * 0.015).toFixed(2);
                  csvRows.push([
                    d.date,
                    d.amount.toFixed(2),
                    d.cash.toFixed(2),
                    d.upi.toFixed(2),
                    d.collected,
                    d.skipped,
                    comm
                  ]);
                });
              } else {
                fileName = `${perfMode}_detailed_logs_${perfYear}_${perfMonth}.csv`;
                csvRows.push(["Date/Time", "Agent Name", "Customer Name", "Account Number", "Amount", "Category", "Payment Mode", "Status"]);
                perfTxns.forEach(tx => {
                  const agent = tx.agentName || 'Unknown';
                  const status = tx.isReversed ? 'REVERSED' : 'ACTIVE';
                  csvRows.push([
                    tx.transactionDate,
                    agent,
                    tx.customerName,
                    tx.customerAccountNumber,
                    tx.amount,
                    tx.category,
                    tx.paymentMode,
                    status
                  ]);
                });
              }

              // Convert array of arrays to CSV string
              const csvContent = csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", fileName);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

            return (
              <div>
                {/* Header */}
                <div className="fade-up" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-.01em', color: G.text }}>Performance &amp; Payroll</h1>
                    <p style={{ color: G.textSub, fontSize: 14, marginTop: 6, fontWeight: 500 }}>Track daily and monthly collection performance metrics and evaluate agent commissions.</p>
                  </div>
                  {/* Mode Toggles */}
                  <div style={{ display: 'flex', background: '#E2E8F0', padding: 3, borderRadius: 8 }}>
                    <button 
                      onClick={() => { setPerfMode('overall'); setSearch(''); }}
                      style={{ 
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                        background: perfMode === 'overall' ? G.surface : 'transparent',
                        color: perfMode === 'overall' ? G.text : G.textSub,
                        boxShadow: perfMode === 'overall' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      🏢 Overall Summary
                    </button>
                    <button 
                      onClick={() => { setPerfMode('agent'); setSearch(''); }}
                      style={{ 
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                        background: perfMode === 'agent' ? G.surface : 'transparent',
                        color: perfMode === 'agent' ? G.text : G.textSub,
                        boxShadow: perfMode === 'agent' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      👤 Agent Breakdown
                    </button>
                  </div>
                </div>

                {/* Filters Panel */}
                <div className="fade-up-1" style={{ display: 'flex', gap: 16, background: G.card, padding: 20, borderRadius: G.rLg, border: `1px solid ${G.border}`, marginBottom: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                  {perfMode === 'agent' && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: G.textSub, marginBottom: 6, textTransform: 'uppercase' }}>Select Field Agent</label>
                      <select value={perfAgent} onChange={e => setPerfAgent(e.target.value)}>
                        <option value="">-- Choose Agent --</option>
                        {agents.filter(a => a.role === 'AGENT').map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ width: 120 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: G.textSub, marginBottom: 6, textTransform: 'uppercase' }}>Year</label>
                    <select value={perfYear} onChange={e => setPerfYear(parseInt(e.target.value))}>
                      {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div style={{ width: 150 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: G.textSub, marginBottom: 6, textTransform: 'uppercase' }}>Month</label>
                    <select value={perfMonth} onChange={e => setPerfMonth(parseInt(e.target.value))}>
                      {[
                        { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' }, { v: 4, l: 'April' },
                        { v: 5, l: 'May' }, { v: 6, l: 'June' }, { v: 7, l: 'July' }, { v: 8, l: 'August' },
                        { v: 9, l: 'September' }, { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
                      ].map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <button className="btn-ghost" onClick={() => handleCSVExport('summary')} disabled={perfTxns.length === 0 || perfLoading}>
                      📊 Export Summary (CSV)
                    </button>
                    <button className="btn-primary" onClick={() => handleCSVExport('detail')} disabled={perfTxns.length === 0 || perfLoading}>
                      📋 Export Logs (CSV)
                    </button>
                  </div>
                </div>

                {perfLoading ? (
                  <div style={{ padding: 80, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
                    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                    <div style={{ color: G.textSub, fontSize: 14, fontWeight: 600 }}>Loading performance stats...</div>
                  </div>
                ) : perfMode === 'agent' && !perfAgent ? (
                  <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 60, textAlign: 'center', color: G.muted, fontStyle: 'italic' }}>
                    Please select a field agent from the dropdown menu to view their monthly performance details.
                  </div>
                ) : (
                  <div>
                    {/* Summary Cards */}
                    <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
                      <StatCard label={perfMode === 'agent' ? "Agent Collection" : "Total Collection"} value={totalAmount} prefix="₹" sub="Total Deposits" spark={SPARK.map(v => v * 0.85)} color={G.accent} icon="🏦" delay={1} />
                      <StatCard label="Cash Collected" value={totalCash} prefix="₹" sub="Physical Cash Vaulted" spark={SPARK.map(v => v * 0.9)} color={G.text} icon="💵" delay={2} />
                      <StatCard label="UPI Collected" value={totalUpi} prefix="₹" sub="UPI Digital Transfers" spark={SPARK} color={G.info} icon="📱" delay={3} />
                      <StatCard 
                        label={perfMode === 'agent' ? "Estimated Payout" : "Total Est Payout"} 
                        value={totalAmount * 0.015} 
                        prefix="₹" 
                        sub="Based on 1.5% Commission" 
                        spark={SPARK.map(v => v * 0.75)} 
                        color={G.purple} 
                        icon="💰" 
                        delay={4} 
                      />
                    </div>

                    {/* Splits: Daily Breakdown & Monthly stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32, alignItems: 'start' }}>
                      
                      {/* Daily Breakdown Table */}
                      <div className="fade-up-3" style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: G.text }}>Daily Collection Breakdown</div>
                          <div style={{ fontSize: 12, background: G.accentBg, color: G.accent, padding: '4px 12px', borderRadius: 12, fontWeight: 700 }}>
                            {dailyList.length} Active Days
                          </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: `2px solid ${G.border}`, paddingBottom: 10 }}>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'right' }}>Total Collection</th>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'right' }}>Cash</th>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'right' }}>UPI</th>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'center' }}>Visits</th>
                                <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'center' }}>Skips</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dailyList.length === 0 ? (
                                <tr>
                                  <td colSpan="6" style={{ padding: '32px 0', textAlign: 'center', color: G.muted, fontStyle: 'italic' }}>
                                    No transaction records found for this period.
                                  </td>
                                </tr>
                              ) : (
                                dailyList.map((day, idx) => (
                                  <tr key={day.date} style={{ borderBottom: idx === dailyList.length - 1 ? 'none' : `1px solid ${G.border}` }}>
                                    <td style={{ fontSize: 13, fontWeight: 600, color: G.text, padding: '12px 8px' }}>{day.date}</td>
                                    <td style={{ fontSize: 13, fontWeight: 700, color: G.text, padding: '12px 8px', textAlign: 'right' }}>{fmtR(day.amount)}</td>
                                    <td style={{ fontSize: 13, color: G.textSub, padding: '12px 8px', textAlign: 'right' }}>{fmtR(day.cash)}</td>
                                    <td style={{ fontSize: 13, color: G.textSub, padding: '12px 8px', textAlign: 'right' }}>{fmtR(day.upi)}</td>
                                    <td style={{ fontSize: 13, fontWeight: 600, color: G.text, padding: '12px 8px', textAlign: 'center' }}>
                                      <span className="tag tag-green">{day.collected}</span>
                                    </td>
                                    <td style={{ fontSize: 13, fontWeight: 600, color: G.text, padding: '12px 8px', textAlign: 'center' }}>
                                      <span className="tag tag-amber">{day.skipped}</span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Performance Metrics Summary */}
                      <div className="fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20, color: G.text }}>Visits &amp; Efficiency</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${G.border}`, paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Completed Visits</span>
                              <span style={{ fontSize: 14, color: G.text, fontWeight: 700 }}>{totalCollectedCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${G.border}`, paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Skipped Visits</span>
                              <span style={{ fontSize: 14, color: G.text, fontWeight: 700 }}>{totalSkippedCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${G.border}`, paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Total Visited</span>
                              <span style={{ fontSize: 14, color: G.text, fontWeight: 700 }}>{totalCollectedCount + totalSkippedCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Visits Efficiency</span>
                              <span style={{ fontSize: 13, color: G.accent, fontWeight: 700, background: G.accentBg, padding: '2px 8px', borderRadius: 4 }}>
                                {totalCollectedCount + totalSkippedCount > 0 
                                  ? `${((totalCollectedCount / (totalCollectedCount + totalSkippedCount)) * 100).toFixed(1)}%` 
                                  : '0.0%'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20, color: G.text }}>Payroll Summary</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${G.border}`, paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Collection Base</span>
                              <span style={{ fontSize: 14, color: G.text, fontWeight: 700 }}>{fmtR(totalAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${G.border}`, paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Commission Rate</span>
                              <span style={{ fontSize: 14, color: G.text, fontWeight: 700 }}>1.50%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
                              <span style={{ fontSize: 13, color: G.textSub, fontWeight: 500 }}>Estimated Payout</span>
                              <span style={{ fontSize: 14, color: G.purple, fontWeight: 700, background: 'rgba(139, 92, 246, 0.08)', padding: '2px 8px', borderRadius: 4 }}>
                                {fmtR(totalAmount * 0.015)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Log Table */}
                    <div className="fade-up-5" style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: G.text }}>Detailed Collections Log</div>
                        <div style={{ width: 300 }}>
                          <input 
                            type="text" 
                            placeholder="Search customer, account, or agent..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            style={{ padding: '8px 12px', fontSize: 13 }}
                          />
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${G.border}` }}>
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Timestamp</th>
                              {perfMode === 'overall' && <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Agent</th>}
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Customer</th>
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Account No</th>
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Category</th>
                              <th style={{ fontSize: 11, fontWeight: 700, color: G.textSub, padding: '12px 8px', textTransform: 'uppercase' }}>Mode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTxns.length === 0 ? (
                              <tr>
                                <td colSpan={perfMode === 'overall' ? "7" : "6"} style={{ padding: '32px 0', textAlign: 'center', color: G.muted, fontStyle: 'italic' }}>
                                  No matching records found.
                                </td>
                              </tr>
                            ) : (
                              filteredTxns.slice(0, 100).map((tx, idx) => {
                                const isSkip = tx.category && (tx.category.startsWith('SKIPPED') || tx.category === 'CLOSURE_REQUESTED');
                                return (
                                  <tr key={tx.id || idx} style={{ borderBottom: idx === filteredTxns.length - 1 || idx === 99 ? 'none' : `1px solid ${G.border}` }}>
                                    <td style={{ fontSize: 13, color: G.textSub, padding: '12px 8px' }}>{new Date(tx.transactionDate).toLocaleString('en-IN')}</td>
                                    {perfMode === 'overall' && <td style={{ fontSize: 13, fontWeight: 600, color: G.text, padding: '12px 8px' }}>{tx.agentName}</td>}
                                    <td style={{ fontSize: 13, fontWeight: 600, color: G.text, padding: '12px 8px' }}>{tx.customerName}</td>
                                    <td style={{ fontSize: 13, color: G.textSub, padding: '12px 8px' }}>{tx.customerAccountNumber}</td>
                                    <td style={{ fontSize: 13, fontWeight: 700, color: isSkip ? G.textSub : G.text, padding: '12px 8px', textAlign: 'right' }}>
                                      {isSkip ? '₹0.00' : fmtR(tx.amount)}
                                    </td>
                                    <td style={{ fontSize: 13, padding: '12px 8px' }}>
                                      <span className={`tag ${isSkip ? 'tag-amber' : tx.category === 'LOAN_REPAYMENT' ? 'tag-purple' : 'tag-green'}`}>
                                        {tx.category ? tx.category.replace('_DEPOSIT', '') : 'DEPOSIT'}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: G.textSub, padding: '12px 8px' }}>{tx.paymentMode}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                        {filteredTxns.length > 100 && (
                          <div style={{ padding: '16px 0 0', textAlign: 'center', fontSize: 12, color: G.textSub, fontStyle: 'italic', borderTop: `1px solid ${G.border}` }}>
                            Showing top 100 entries. Export to CSV to view full data sheet ({filteredTxns.length} records).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ════════════════════════════════════════════════════════════
              TAB: LOGISTICS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'logistics' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Logistics Engine</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>Manage geospatial routes and dispatch field operatives.</p>
                </div>
                <button className="btn-primary" onClick={async () => {
                  const name = window.prompt("Define geographical route designation (e.g., Sector 4 North):");
                  if (name) {
                    try {
                      await axios.post('http://localhost:8085/api/routes/create', { routeName: name }, authH);
                      fetchAll();
                    } catch (e) {
                      alert(e.response?.data?.message || e.response?.data?.error || (typeof e.response?.data === 'string' ? e.response.data : "Route creation rejected."));
                    }
                  }
                }}>Define New Route</button>
              </div>

              {/* View Toggle Buttons */}
              <div className="fade-up-1" style={{ display: 'flex', gap: 12, marginBottom: 24, background: G.surface, padding: 4, borderRadius: 6, border: `1px solid ${G.border}`, width: 'fit-content' }}>
                <button onClick={() => { setLogisticsView('routes'); setSelectedRoute(null); setSelectedAgentForLogistics(null); setLocalSequenceOrder(null); }} style={{
                  padding: '8px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  background: logisticsView === 'routes' ? G.card : 'transparent',
                  color: logisticsView === 'routes' ? G.text : G.textSub,
                  cursor: 'pointer', border: 'none', transition: 'all .2s'
                }}>View by Route</button>
                <button onClick={() => { setLogisticsView('agents'); setSelectedRoute(null); setSelectedAgentForLogistics(null); setLocalSequenceOrder(null); }} style={{
                  padding: '8px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  background: logisticsView === 'agents' ? G.card : 'transparent',
                  color: logisticsView === 'agents' ? G.text : G.textSub,
                  cursor: 'pointer', border: 'none', transition: 'all .2s'
                }}>View by Agent</button>
              </div>

              <div className="fade-up-2" style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:24 }}>
                
                {/* LEFT COLUMN: ROUTES OR AGENTS */}
                {logisticsView === 'routes' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <h3 style={{ fontSize:14, color:G.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Geographies</h3>
                    {routes.length === 0 ? (
                      <div style={{ padding:40, textAlign:'center', background:G.card, border:`1px dashed ${G.borderHi}`, borderRadius:G.rLg, color:G.muted, fontSize:13, fontStyle: 'italic' }}>
                        No routes defined.
                      </div>
                    ) : routes.map(r => {
                      const routeCusts = customers.filter(c => c.route?.id === r.id);
                      const isSelected = selectedRoute?.id === r.id;
                      return (
                        <div key={r.id} onClick={() => setSelectedRoute(r)} style={{
                          padding:'20px 24px', background:isSelected ? G.accentBg : G.surface,
                          border:`1px solid ${isSelected ? G.accent : G.border}`,
                          borderRadius:4, cursor:'pointer', transition:'all .2s',
                          borderLeft: isSelected ? `4px solid ${G.accent}` : `1px solid ${G.border}`
                        }}>
                          <div style={{ fontWeight:700, color:isSelected ? G.accentDim : G.text, fontFamily:'var(--font-display)', fontSize:18 }}>
                            {r.routeName || r.name}
                          </div>
                          <div style={{ fontSize:12, color:G.textSub, marginTop:8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{routeCusts.length} accounts assigned</span>
                            {r.assignedAgent && (
                              <span style={{ fontSize:10, color:G.accent, background:G.accentBg, padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
                                👤 {r.assignedAgent.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <h3 style={{ fontSize:14, color:G.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Field Operatives</h3>
                    {agents.filter(a => a.role === 'AGENT').length === 0 ? (
                      <div style={{ padding:40, textAlign:'center', background:G.card, border:`1px dashed ${G.borderHi}`, borderRadius:G.rLg, color:G.muted, fontSize:13, fontStyle: 'italic' }}>
                        No agents registered.
                      </div>
                    ) : agents.filter(a => a.role === 'AGENT').map(a => {
                      const agentCusts = customers.filter(c => c.assignedAgent?.id === a.id);
                      const isSelected = selectedAgentForLogistics?.id === a.id;
                      const activeRoute = routes.find(r => r.assignedAgent?.id === a.id);

                      return (
                        <div key={a.id} onClick={() => { setSelectedAgentForLogistics(a); setLocalSequenceOrder(null); }} style={{
                          padding:'20px 24px', background:isSelected ? G.accentBg : G.surface,
                          border:`1px solid ${isSelected ? G.accent : G.border}`,
                          borderRadius:4, cursor:'pointer', transition:'all .2s',
                          borderLeft: isSelected ? `4px solid ${G.accent}` : `1px solid ${G.border}`
                        }}>
                          <div style={{ fontWeight:700, color:isSelected ? G.accentDim : G.text, fontFamily:'var(--font-display)', fontSize:18 }}>
                            {a.name}
                          </div>
                          <div style={{ fontSize:12, color:G.textSub, marginTop:4 }}>{a.email}</div>
                          <div style={{ fontSize:12, color:G.textSub, marginTop:8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{agentCusts.length} clients linked</span>
                            {activeRoute && (
                              <span style={{ fontSize:10, color:G.info, background:G.surface, padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
                                📍 Route: {activeRoute.routeName || activeRoute.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* RIGHT COLUMN: DETAIL/MAP WORKSPACE */}
                {logisticsView === 'routes' ? (
                  <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:32, display:'flex', flexDirection:'column', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    {!selectedRoute ? (
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>
                        <div style={{ fontSize:40, marginBottom:16, opacity: 0.5 }}>🗺️</div>
                        Select a geography from the index to configure logistics.
                      </div>
                    ) : (
                      <div className="fade-up">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${G.border}` }}>
                          <div>
                            <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:G.text }}>{selectedRoute.routeName || selectedRoute.name}</h2>
                            <div style={{ fontSize:13, color:G.textSub, marginTop:6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>Configure sequence and assign operative.</span>
                              {selectedRoute.assignedAgent && (
                                <span style={{ fontSize:11, color:G.accentDim, background:G.accentBg, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>
                                  Dispatched Operative: {selectedRoute.assignedAgent.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="btn-primary" style={{ background: G.info, color: '#FFF' }} onClick={async () => {
                            const agentId = window.prompt(`Dispatch protocol. Enter Operative ID:\n(Available: ${agents.filter(a=>a.role==='AGENT').map(a => `${a.id}-${a.name}`).join(', ')})`);
                            if(agentId) {
                              try {
                                await axios.post('http://localhost:8085/api/routes/assign-shift', { routeId: selectedRoute.id, agentId: parseInt(agentId) }, authH);
                                alert("Operative officially dispatched!");
                                await fetchAll();
                              } catch(_e) { alert("Dispatch failed."); }
                            }
                          }}>
                            Dispatch Operative
                          </button>
                        </div>

                        {leafletLoaded ? (
                          <LogisticsMap selectedRoute={selectedRoute} customers={customers} authH={authH} onCoordinatesUpdate={handleCoordinatesUpdate} />
                        ) : (
                          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.surface, borderRadius: 8, border: `1px solid ${G.border}`, marginBottom: 24, fontSize: 13, color: G.textSub }}>
                            Loading Interactive Route Map...
                          </div>
                        )}

                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
                          <div>
                            <h4 style={{ fontSize:12, color:G.text, fontWeight: 700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16, paddingBottom: 8, borderBottom: `1px solid ${G.border}` }}>Optimized Sequence</h4>
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              {customers.filter(c => c.route?.id === selectedRoute.id)
                                .sort((a,b) => (a.routeSequence||0) - (b.routeSequence||0))
                                .map(c => (
                                  <div key={c.id} style={{ padding:'12px 16px', background:G.surface, border:`1px solid ${G.border}`, borderRadius:4, display:'flex', alignItems:'center', gap:16 }}>
                                    <div style={{ width:28, height:28, borderRadius:4, background:G.bg, border: `1px solid ${G.borderHi}`, color:G.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>
                                      {c.routeSequence || 0}
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:13, fontWeight:600, color:G.text }}>{c.name}</div>
                                      <div style={{ fontSize:11, color:G.textSub, fontFamily: 'monospace', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div>ACC: {c.accountNumber}</div>
                                        <div>
                                          {c.assignedAgent ? (
                                            <span style={{ color: G.accent, fontWeight: 600 }}>👤 Agent: {c.assignedAgent.name}</span>
                                          ) : (
                                            <span style={{ color: G.warn, fontWeight: 600 }}>👤 Unassigned</span>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ fontSize:10, color:G.textSub, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>{c.latitude ? `📍 ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '📍 No GPS Coordinates'}</span>
                                        <span style={{ color: G.accent, cursor: 'pointer', textDecoration: 'underline' }} onClick={async (e) => {
                                          e.stopPropagation();
                                          const coords = window.prompt(`Set coordinates for ${c.name} (format: lat,lng):`, c.latitude ? `${c.latitude},${c.longitude}` : '');
                                          if (coords) {
                                            const [lat, lng] = coords.split(',').map(Number);
                                            if (!isNaN(lat) && !isNaN(lng)) {
                                              handleCoordinatesUpdate(c.id, lat, lng);
                                            } else {
                                              alert("Invalid coordinates.");
                                            }
                                          }
                                        }}>Edit</span>
                                      </div>
                                    </div>
                                  </div>
                              ))}
                              {customers.filter(c => c.route?.id === selectedRoute.id).length === 0 && (
                                <div style={{ fontSize:13, color:G.muted, fontStyle:'italic', padding: 16, background: G.surface, borderRadius: 4 }}>No accounts routed yet.</div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 style={{ fontSize:12, color:G.text, fontWeight: 700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16, paddingBottom: 8, borderBottom: `1px solid ${G.border}` }}>Unassigned Pool</h4>
                            <div style={{ display:'flex', flexDirection:'column', gap:12, maxHeight:'500px', overflowY:'auto', paddingRight:8 }}>
                              {customers.filter(c => !c.route).map(c => (
                                <div key={c.id} style={{ padding:'12px 16px', background:G.surface, border:`1px dashed ${G.borderHi}`, borderRadius:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <div>
                                    <div style={{ fontSize:13, fontWeight:600, color:G.text }}>{c.name}</div>
                                    <div style={{ fontSize:11, color:G.textSub, fontFamily: 'monospace', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <div>ACC: {c.accountNumber}</div>
                                      <div>
                                        {c.assignedAgent ? (
                                          <span style={{ color: G.accent, fontWeight: 600 }}>👤 Agent: {c.assignedAgent.name}</span>
                                        ) : (
                                          <span style={{ color: G.warn, fontWeight: 600 }}>👤 Unassigned</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:11, color:G.text, fontWeight: 600 }} onClick={async () => {
                                    const seq = window.prompt(`Define sequence parameter for ${c.name}:`, "1");
                                    if(seq) {
                                      try {
                                        await axios.post('http://localhost:8085/api/routes/assign-customer', {
                                          customerId: c.id, routeId: selectedRoute.id, routeSequence: parseInt(seq)
                                        }, authH);
                                        fetchAll();
                                      } catch(_e) { alert("Assignment rejected"); }
                                    }
                                  }}>Add</button>
                                </div>
                              ))}
                              {customers.filter(c => !c.route).length === 0 && (
                                <div style={{ fontSize:13, color:G.accentDim, fontStyle:'italic', fontWeight: 500 }}>All network accounts routed.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:32, display:'flex', flexDirection:'column', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    {!selectedAgentForLogistics ? (
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>
                        <div style={{ fontSize:40, marginBottom:16, opacity: 0.5 }}>🚶</div>
                        Select a field operative from the index to view their assigned clients.
                      </div>
                    ) : (
                      <div className="fade-up">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${G.border}` }}>
                          <div>
                            <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:G.text }}>{selectedAgentForLogistics.name}</h2>
                            <div style={{ fontSize:13, color:G.textSub, marginTop:6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>Assigned Agent Profile Dossier & Mapping.</span>
                              {routes.find(r => r.assignedAgent?.id === selectedAgentForLogistics.id) && (
                                <span style={{ fontSize:11, color:G.accentDim, background:G.accentBg, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>
                                  Dispatched: {routes.find(r => r.assignedAgent?.id === selectedAgentForLogistics.id).routeName || routes.find(r => r.assignedAgent?.id === selectedAgentForLogistics.id).name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: G.textSub }}>DISPATCH:</span>
                            <select
                              value={routes.find(r => r.assignedAgent?.id === selectedAgentForLogistics.id)?.id || ''}
                              onChange={async (e) => {
                                const rId = e.target.value;
                                if (rId) {
                                  try {
                                    await axios.post('http://localhost:8085/api/routes/assign-shift', { routeId: parseInt(rId), agentId: selectedAgentForLogistics.id }, authH);
                                    alert("Agent assigned and dispatched successfully!");
                                    fetchAll();
                                  } catch(_e) { alert("Dispatch failed."); }
                                }
                              }}
                              style={{ padding: '8px 12px', background: G.surface, border: `1px solid ${G.border}`, color: G.text, borderRadius: 6, fontSize: 13, outline: 'none' }}
                            >
                              <option value="">— Select Route to Dispatch —</option>
                              {routes.map(r => (
                                <option key={r.id} value={r.id}>{r.routeName || r.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {leafletLoaded ? (
                          <LogisticsMap selectedAgent={selectedAgentForLogistics} customers={customers} authH={authH} onCoordinatesUpdate={handleCoordinatesUpdate} />
                        ) : (
                          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.surface, borderRadius: 8, border: `1px solid ${G.border}`, marginBottom: 24, fontSize: 13, color: G.textSub }}>
                            Loading Interactive Route Map...
                          </div>
                        )}

                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
                          {/* Column 1: Assigned Clients (Visit Sequence) */}
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom: 8, borderBottom: `1px solid ${G.border}` }}>
                              <h4 style={{ fontSize:12, color:G.text, fontWeight: 700, textTransform:'uppercase', letterSpacing:'1px' }}>Assigned Clients ({agentCustomers.length})</h4>
                              {agentCustomers.length > 1 && (
                                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={async () => {
                                  try {
                                    const orderedIds = agentCustomers.map(c => c.id);
                                    await axios.put(`http://localhost:8085/api/customers/agent/${selectedAgentForLogistics.id}/sequence`, orderedIds, authH);
                                    alert("Agent customer sequence saved successfully!");
                                    setLocalSequenceOrder(null);
                                    fetchAll();
                                  } catch (_e) {
                                    alert("Failed to save sequence.");
                                  }
                                }}>Save Sequence</button>
                              )}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              {agentCustomers.length === 0 ? (
                                <div style={{ fontSize:13, color:G.muted, fontStyle:'italic', padding: 16, background: G.surface, borderRadius: 4 }}>No clients assigned to this agent.</div>
                              ) : (
                                agentCustomers.map((c, i) => (
                                  <div
                                    key={c.id}
                                    draggable
                                    onDragStart={() => setDraggedAgentIdx(i)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const draggedItem = agentCustomers[draggedAgentIdx];
                                      const remainingItems = agentCustomers.filter((_, idx) => idx !== draggedAgentIdx);
                                      const newArr = [...remainingItems.slice(0, i), draggedItem, ...remainingItems.slice(i)];
                                      setLocalSequenceOrder(newArr.map(item => item.id));
                                      setDraggedAgentIdx(null);
                                    }}
                                    style={{
                                      padding:'12px 16px', background:G.surface, border:`1px solid ${G.border}`, borderRadius:4,
                                      display:'flex', alignItems:'center', gap:16, cursor:'grab', opacity: draggedAgentIdx === i ? 0.5 : 1
                                    }}
                                  >
                                    <div style={{ fontSize:14, color:G.muted, cursor:'grab' }}>☰</div>
                                    <div style={{ width:24, height:24, borderRadius:4, background:G.bg, border: `1px solid ${G.borderHi}`, color:G.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                                      {i + 1}
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:13, fontWeight:600, color:G.text }}>{c.name}</div>
                                      <div style={{ fontSize:11, color:G.textSub, fontFamily: 'monospace', marginTop: 2 }}>
                                        ID: {c.accountNumber} &nbsp;·&nbsp; Route: <strong>{c.route?.name || 'None'}</strong>
                                      </div>
                                      <div style={{ fontSize:10, color:G.textSub, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>{c.latitude ? `📍 ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '📍 No GPS Coordinates'}</span>
                                        <span style={{ color: G.accent, cursor: 'pointer', textDecoration: 'underline' }} onClick={async (e) => {
                                          e.stopPropagation();
                                          const coords = window.prompt(`Set coordinates for ${c.name} (format: lat,lng):`, c.latitude ? `${c.latitude},${c.longitude}` : '');
                                          if (coords) {
                                            const [lat, lng] = coords.split(',').map(Number);
                                            if (!isNaN(lat) && !isNaN(lng)) {
                                              handleCoordinatesUpdate(c.id, lat, lng);
                                            } else {
                                              alert("Invalid coordinates.");
                                            }
                                          }
                                        }}>Edit GPS</span>
                                        &nbsp;·&nbsp;
                                        <span style={{ color: G.danger, cursor: 'pointer', textDecoration: 'underline' }} onClick={async (e) => {
                                          e.stopPropagation();
                                          if (window.confirm(`Unassign ${c.name} from agent ${selectedAgentForLogistics.name}?`)) {
                                            try {
                                              await axios.put(`http://localhost:8085/api/customers/${c.id}/assign-agent/null`, {}, authH);
                                              setLocalSequenceOrder(null);
                                              fetchAll();
                                            } catch(_e) { alert("Failed to unassign customer."); }
                                          }
                                        }}>Unassign</span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Column 2: Unassigned Customers Pool */}
                          <div>
                            <h4 style={{ fontSize:12, color:G.text, fontWeight: 700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16, paddingBottom: 8, borderBottom: `1px solid ${G.border}` }}>Unassigned Customers Pool</h4>
                            <div style={{ display:'flex', flexDirection:'column', gap:12, maxHeight:'500px', overflowY:'auto', paddingRight:8 }}>
                              {customers.filter(c => !c.assignedAgent).map(c => (
                                <div key={c.id} style={{ padding:'12px 16px', background:G.surface, border:`1px dashed ${G.borderHi}`, borderRadius:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <div>
                                    <div style={{ fontSize:13, fontWeight:600, color:G.text }}>{c.name}</div>
                                    <div style={{ fontSize:11, color:G.textSub, fontFamily: 'monospace', marginTop: 2 }}>
                                      ID: {c.accountNumber}
                                    </div>
                                  </div>
                                  <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:11, color:G.text, fontWeight: 600 }} onClick={async () => {
                                    try {
                                      await axios.put(`http://localhost:8085/api/customers/${c.id}/assign-agent/${selectedAgentForLogistics.id}`, {}, authH);
                                      setLocalSequenceOrder(null);
                                      fetchAll();
                                    } catch(_e) { alert("Failed to assign customer to agent."); }
                                  }}>Assign to Agent</button>
                                </div>
                              ))}
                              {customers.filter(c => !c.assignedAgent).length === 0 && (
                                <div style={{ fontSize:13, color:G.accentDim, fontStyle:'italic', fontWeight: 500 }}>All clients in network are assigned to agents.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: CUSTOMERS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'customers' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Client Registry</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>
                    {customers.length} Accounts · Network Valuation: {fmtR(stats?.totalPortfolio || 0)}
                  </p>
                </div>
                {user?.role !== 'AGENT' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {user?.role === 'ADMIN' && (
                      <button className="btn-primary" onClick={handleRecalculateRisk} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: 13 }}>
                        ⚡ Recalculate Default Risk
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => setTab('sync')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔄 Sync Bank Data
                    </button>
                  </div>
                )}
              </div>
              
              <div className="fade-up-1" style={{ marginBottom:24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position:'relative', width: 350 }}>
                  <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:G.muted, fontSize:14 }}>🔍</span>
                  <input className="ag-input" value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Query by name or ID…" style={{ paddingLeft:44, fontSize: 14 }}/>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: G.textSub, letterSpacing: '0.5px' }}>RISK FILTER:</span>
                  <div style={{ display: 'flex', gap: 4, background: G.surface, padding: 4, borderRadius: 6, border: `1px solid ${G.border}` }}>
                    {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(rf => (
                      <button key={rf} onClick={() => setRiskFilter(rf)} style={{
                        padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: riskFilter === rf ? G.card : 'transparent',
                        color: riskFilter === rf ? (rf === 'CRITICAL' ? '#EF4444' : rf === 'HIGH' ? '#F97316' : rf === 'MEDIUM' ? '#EAB308' : G.text) : G.textSub,
                        boxShadow: riskFilter === rf ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer', transition: 'all .2s', letterSpacing: '0.5px'
                      }}>{rf}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="fade-up-2" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'48px 1.5fr 120px 120px 140px 140px', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, background:G.bg, fontSize:11, fontWeight: 700, color:G.textSub, letterSpacing:'1px', textTransform:'uppercase' }}>
                  <div/><div>Identity / Account ID</div><div>Contact</div><div>Savings Balance</div><div>Outstanding Loan</div><div>Management</div>
                </div>
                {loading
                  ? <div style={{ padding:24 }}>{[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:64, marginBottom:12 }}/>)}</div>
                  : filteredCustomers.length === 0
                    ? <div style={{ padding:80, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>{custSearch || riskFilter !== 'ALL' ? 'No parameters matched.' : 'Registry empty.'}</div>
                    : filteredCustomers.map((c,i) => (
                        <div key={c.id} style={{ display:'grid', gridTemplateColumns:'48px 1.5fr 120px 120px 140px 140px', alignItems:'center', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, transition: 'background 0.2s' }}
                             onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width:40, height:40, borderRadius:4, background:`${colors[i%colors.length]}15`, color:colors[i%colors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily: 'var(--font-display)' }}>{initials(c.name)}</div>
                          <div>
                            <div style={{ fontSize:14, color:G.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {c.name}
                              {c.riskStatus && c.riskStatus !== 'LOW' && (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  background: c.riskStatus === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : c.riskStatus === 'HIGH' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                  color: c.riskStatus === 'CRITICAL' ? '#EF4444' : c.riskStatus === 'HIGH' ? '#F97316' : '#EAB308',
                                  border: `1px solid ${c.riskStatus === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : c.riskStatus === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`
                                }}>
                                  {c.riskStatus}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:12, color:G.textSub, fontFamily: 'monospace', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div>ID: {c.accountNumber}</div>
                              <div style={{ fontSize: 11, marginTop: 2 }}>
                                {c.assignedAgent ? (
                                  <span style={{ color: G.accent, fontWeight: 600 }}>👤 Agent: {c.assignedAgent.name}</span>
                                ) : (
                                  <span style={{ color: G.warn, fontWeight: 600 }}>👤 Unassigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize:13, color:G.textSub, fontWeight: 500 }}>{c.phoneNumber || '—'}</div>
                          <div style={{ fontSize:14, color:G.text, fontWeight:700 }}>{fmtR(c.currentBalance)}</div>
                          <div style={{ fontSize:14, color: c.activeLoan ? G.danger : G.textSub, fontWeight:700 }}>
                            {c.activeLoan ? fmtR(c.activeLoan.outstandingLoan) : '—'}
                          </div>
                          <button className="btn-ghost" style={{ padding:'8px 16px', fontSize:12 }} onClick={() => setSelectedCustomer(c)}>Inspect Dossier</button>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: USERS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'agents' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Access Management</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>
                    {agents.length} Total Identities · {agents.filter(a=>a.role==='AGENT').length} Operatives · {agents.filter(a=>a.role==='MANAGER').length} Managers
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddAgent(true)}>Provision User</button>
              </div>

              <div className="fade-up-1" style={{ display:'flex', gap:16, marginBottom:24 }}>
                <div style={{ flex:1, position:'relative', maxWidth: 400 }}>
                  <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:G.muted, fontSize:14 }}>🔍</span>
                  <input className="ag-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Query identity directory…" style={{ paddingLeft:44, fontSize: 14 }}/>
                </div>
                <div style={{ display: 'flex', gap: 8, background: G.surface, padding: 4, borderRadius: 6, border: `1px solid ${G.border}` }}>
                  {['ALL','AGENT','MANAGER','ADMIN'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)} style={{
                      padding:'10px 20px', borderRadius:4, fontSize:12, fontWeight: 600,
                      background: roleFilter===r ? G.card : 'transparent',
                      color: roleFilter===r ? G.text : G.textSub,
                      boxShadow: roleFilter===r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor:'pointer', transition:'all .2s', letterSpacing:'1px', textTransform: 'uppercase'
                    }}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="fade-up-2" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'48px 1fr 130px 110px 120px 120px', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, background:G.surface, fontSize:11, fontWeight: 700, color:G.textSub, letterSpacing:'1px', textTransform:'uppercase' }}>
                  <div/><div>Identity Profile</div><div>Contact</div><div>Clearance</div><div>Assignment</div><div>Action</div>
                </div>
                {loading
                  ? <div style={{ padding:24 }}>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:64, marginBottom:12 }}/>)}</div>
                  : filteredAgents.length === 0
                    ? <div style={{ padding:80, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>{search ? 'No identities match.' : 'Directory empty.'}</div>
                    : filteredAgents.map((a,i) => (
                        <div key={a.id} style={{ display:'grid', gridTemplateColumns:'48px 1fr 130px 110px 120px 120px', alignItems:'center', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, transition: 'background 0.2s' }}
                             onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width:40, height:40, borderRadius:4, background:`${colors[i%colors.length]}15`, color:colors[i%colors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily: 'var(--font-display)' }}>{initials(a.name)}</div>
                          <div>
                            <div style={{ fontSize:14, color:G.text, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontSize:12, color:G.textSub, marginTop: 4 }}>{a.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              {a.role === 'AGENT' && (
                                <span style={{ fontSize:11, color: G.accent, fontWeight: 600 }}>
                                  🔗 {customers.filter(c => c.assignedAgent?.id === a.id).length} Linked Clients
                                </span>
                              )}
                              {a.role === 'AGENT' && (
                                <span style={{ fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 2, background: a.registeredDeviceId ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 71, 87, 0.1)', color: a.registeredDeviceId ? '#00e676' : '#ff4757', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  {a.registeredDeviceId ? '📱 BOUND' : '📱 UNBOUND'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize:13, color:G.textSub, fontWeight: 500 }}>{a.phoneNumber || '—'}</div>
                          <div><span className={`tag ${roleTag[a.role] || 'tag-blue'}`}>{a.role}</span></div>
                          <div style={{ fontSize:13, color:G.text, fontWeight: 500 }}>{a.branch?.name || 'HQ'}</div>
                          <button className="btn-ghost" style={{ padding:'8px 16px', fontSize:12 }} onClick={() => setEditAgent(a)}>Configure</button>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: APPROVALS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'approvals' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32 }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Pending Authorizations</h1>
                <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>Review and approve loan origination requests from the network.</p>
              </div>

              <div className="fade-up-1" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 120px 200px', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, background:G.surface, fontSize:11, fontWeight: 700, color:G.textSub, letterSpacing:'1px', textTransform:'uppercase' }}>
                  <div>Client Details</div><div>Principal</div><div>Interest</div><div>Monthly EMI</div><div>Actions</div>
                </div>
                {loading
                  ? <div style={{ padding:24 }}>{[1,2].map(i=><div key={i} className="skeleton" style={{ height:64, marginBottom:12 }}/>)}</div>
                  : pendingLoans.length === 0
                    ? <div style={{ padding:80, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>No pending loan authorizations found.</div>
                    : pendingLoans.map((l) => (
                        <div key={l.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 120px 200px', alignItems:'center', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, transition: 'background 0.2s' }}
                             onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <div style={{ fontSize:14, color:G.text, fontWeight: 600 }}>{l.customerName}</div>
                            <div style={{ fontSize:12, color:G.textSub, marginTop: 4 }}>Ref ID: #{l.id}</div>
                          </div>
                          <div style={{ fontSize:14, color:G.text, fontWeight:700 }}>{fmtR(l.principalAmount)}</div>
                          <div style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>{l.interestRate}%</div>
                          <div style={{ fontSize:14, color:G.info, fontWeight:700 }}>{fmtR(l.monthlyEmiAmount)}</div>
                          <div style={{ display:'flex', gap:10 }}>
                            <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12, background: G.accent, width: 'auto' }} onClick={async () => {
                              if (window.confirm(`Approve loan origination of ${fmtR(l.principalAmount)} for ${l.customerName}?`)) {
                                try {
                                  await axios.put(`http://localhost:8085/api/loans/approve/${l.id}`, {}, authH);
                                  alert("Loan approved successfully!");
                                  fetchAll();
                                } catch (_e) { alert("Failed to approve loan"); }
                              }
                            }}>Approve</button>
                            <button className="btn-danger" style={{ padding:'8px 16px', fontSize:12, background: G.danger, color: '#FFF' }} onClick={async () => {
                              if (window.confirm(`Reject loan origination request for ${l.customerName}?`)) {
                                try {
                                  await axios.put(`http://localhost:8085/api/loans/reject/${l.id}`, {}, authH);
                                  alert("Loan request rejected.");
                                  fetchAll();
                                } catch (_e) { alert("Failed to reject loan"); }
                              }
                            }}>Reject</button>
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: BRANCHES
              ════════════════════════════════════════════════════════════ */}
          {tab === 'branches' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Branch Network</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>Monitor and manage localized divisions across your territory.</p>
                </div>
                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBranch(true)}>Establish Branch</button>
              </div>

              <div className="fade-up-1" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'100px 1.5fr 1fr 1.5fr 100px', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, background:G.surface, fontSize:11, fontWeight: 700, color:G.textSub, letterSpacing:'1px', textTransform:'uppercase' }}>
                  <div>Code</div><div>Branch Name</div><div>City</div><div>Address</div><div>Actions</div>
                </div>
                {loading
                  ? <div style={{ padding:24 }}>{[1,2].map(i=><div key={i} className="skeleton" style={{ height:64, marginBottom:12 }}/>)}</div>
                  : branches.length === 0
                    ? <div style={{ padding:80, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>No branches established.</div>
                    : branches.map((b) => (
                        <div key={b.id} style={{ display:'grid', gridTemplateColumns:'100px 1.5fr 1fr 1.5fr 100px', alignItems:'center', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, transition: 'background 0.2s' }}
                             onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontFamily:'monospace', fontWeight:700, color: G.accent }}>{b.branchCode || '—'}</div>
                          <div style={{ fontSize:14, color:G.text, fontWeight:600 }}>{b.name}</div>
                          <div style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>{b.city || '—'}</div>
                          <div style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>{b.address || '—'}</div>
                          <div>
                            <button className="btn-danger" style={{ padding:'6px 12px', fontSize:11, background: G.danger, color: '#FFF' }} onClick={async () => {
                              if (window.confirm(`Delete branch "${b.name}"? This will unassign any users tied to this branch.`)) {
                                try {
                                  await axios.delete(`http://localhost:8085/api/branches/${b.id}`, authH);
                                  alert("Branch deleted successfully!");
                                  fetchAll();
                                } catch (_e) { alert("Failed to delete branch."); }
                              }
                            }}>Delete</button>
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: ANALYTICS
              ════════════════════════════════════════════════════════════ */}
          {tab === 'analytics' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32 }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Financial Intelligence</h1>
                <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>System telemetry, portfolio distribution, and network performance indicators.</p>
              </div>

              <div className="fade-up-1" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:20, marginBottom:32 }}>
                <StatCard label="Network Valuation" value={stats?.totalPortfolio ?? 0} prefix="₹" sub="Cumulative Managed Portfolio" spark={SPARK.map(v=>v*0.85)} color={G.text} icon="🏦" delay={1}/>
                <StatCard label="Daily Collection" value={stats?.todayCollection ?? 0} prefix="₹" sub="Cleared Today" spark={SPARK.map(v=>v*0.9)} color={G.accent} icon="⚖️" delay={2}/>
                <StatCard label="Transaction Velocity" value={stats?.todayTxnCount ?? 0} sub="Cleared Operations Today" spark={SPARK} color={G.info} icon="⚡" delay={3}/>
                <StatCard label="Total Registries" value={stats?.customerCount ?? 0} sub="Managed Client Bases" spark={SPARK.map(v=>v*0.75)} color={G.purple} icon="👥" delay={4}/>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                {/* Branch Operative Distribution */}
                <div className="fade-up-2" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:20, color: G.text }}>Operative Density per Branch</div>
                  {stats?.agentsPerBranch && Object.keys(stats.agentsPerBranch).length > 0 ? (
                    Object.entries(stats.agentsPerBranch).map(([bName, count], idx) => (
                      <div key={bName} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: idx === Object.keys(stats.agentsPerBranch).length - 1 ? 'none' : `1px solid ${G.border}` }}>
                        <div style={{ fontSize:14, color:G.text, fontWeight:600 }}>{bName}</div>
                        <div style={{ background:G.accentBg, color:G.accent, fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:12 }}>{count} {count === 1 ? 'agent' : 'agents'}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding:40, textAlign:'center', color:G.muted, fontStyle:'italic', fontSize:13 }}>No branch agent distribution telemetry available.</div>
                  )}
                </div>

                {/* System Activity Summary */}
                <div className="fade-up-3" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:20, color: G.text }}>Network Node Telemetry</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${G.border}`, paddingBottom:12 }}>
                      <span style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>Active Nodes (Branches)</span>
                      <span style={{ fontSize:14, color:G.text, fontWeight:700 }}>{stats?.branchCount ?? 0}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${G.border}`, paddingBottom:12 }}>
                      <span style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>Supervisors (Managers)</span>
                      <span style={{ fontSize:14, color:G.text, fontWeight:700 }}>{stats?.managerCount ?? 0}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${G.border}`, paddingBottom:12 }}>
                      <span style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>Active Field Operatives</span>
                      <span style={{ fontSize:14, color:G.text, fontWeight:700 }}>{stats?.agentCount ?? 0}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', paddingBottom:4 }}>
                      <span style={{ fontSize:13, color:G.textSub, fontWeight:500 }}>SaaS Subscription Level</span>
                      <span style={{ fontSize:12, color:G.accent, fontWeight:700, background:G.accentBg, padding:'2px 8px', borderRadius:4, textTransform:'uppercase' }}>{user?.tenantPlan || 'ENTERPRISE'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: SECURITY AUDIT
              ════════════════════════════════════════════════════════════ */}
          {tab === 'audit' && (
            <div>
              <div className="fade-up" style={{ marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-.01em', color: G.text }}>Security Audit Logs</h1>
                  <p style={{ color:G.textSub, fontSize:14, marginTop:6, fontWeight: 500 }}>Real-time cryptographic trail of administrative and operational actions.</p>
                </div>
              </div>

              <div className="fade-up-1" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'180px 120px 120px 1.2fr 1.8fr', gap:20, padding:'16px 24px', borderBottom:`1px solid ${G.border}`, background:G.surface, fontSize:11, fontWeight: 700, color:G.textSub, letterSpacing:'1px', textTransform:'uppercase' }}>
                  <div>Timestamp</div><div>Actor</div><div>Action</div><div>Target Entity</div><div>Details</div>
                </div>
                {loading
                  ? <div style={{ padding:24 }}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:52, marginBottom:12 }}/>)}</div>
                  : auditLogs.length === 0
                    ? <div style={{ padding:80, textAlign:'center', color:G.muted, fontSize:14, fontStyle: 'italic' }}>No audit trails recorded.</div>
                    : auditLogs.map((log) => (
                        <div key={log.id} style={{ display:'grid', gridTemplateColumns:'180px 120px 120px 1.2fr 1.8fr', alignItems:'center', gap:20, padding:'14px 24px', borderBottom:`1px solid ${G.border}`, fontSize:13 }}
                             onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ color: G.textSub, fontFamily:'monospace' }}>{new Date(log.timestamp).toLocaleString('en-IN')}</div>
                          <div style={{ fontWeight:600, color:G.text }}>{log.actorName}</div>
                          <div>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, textTransform:'uppercase',
                              background: log.actionType.includes('DELETE') || log.actionType.includes('REJECT') ? '#FED7D7' : log.actionType.includes('CREATE') || log.actionType.includes('APPROVE') ? '#C6F6D5' : '#EBF8FF',
                              color: log.actionType.includes('DELETE') || log.actionType.includes('REJECT') ? '#C53030' : log.actionType.includes('CREATE') || log.actionType.includes('APPROVE') ? '#22543D' : '#2B6CB0'
                            }}>
                              {log.actionType}
                            </span>
                          </div>
                          <div style={{ color: G.textSub }}>{log.targetEntity} (ID: {log.targetEntityId})</div>
                          <div style={{ color: G.text, fontFamily:'monospace', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={`Prev: ${log.previousState} | New: ${log.newState}`}>
                            {log.newState || log.previousState || '—'}
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── MODALS ── */}
      {showAddAgent && (
        <Modal title="Provision New Identity" onClose={() => setShowAddAgent(false)}>
          <AddAgentForm user={user} branches={branches} onSuccess={async () => { await new Promise(r => setTimeout(r, 300)); await fetchAll(); setShowAddAgent(false); }} onClose={() => setShowAddAgent(false)} />
        </Modal>
      )}
      {showAddBranch && (
        <Modal title="Establish Network Branch" onClose={() => setShowAddBranch(false)} maxWidth={480}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:G.textSub, marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>Official Designation</label>
            <input className="ag-input" value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. Sector 4 Division"/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:G.textSub, marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>Branch Code</label>
            <input className="ag-input" value={branchCode} onChange={e => setBranchCode(e.target.value)} placeholder="e.g. SEC4-01"/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:G.textSub, marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>Geographic Location (City)</label>
            <input className="ag-input" value={branchCity} onChange={e => setBranchCity(e.target.value)} placeholder="e.g. Pune"/>
          </div>
          <div style={{ marginBottom:32 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:G.textSub, marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>Address</label>
            <input className="ag-input" value={branchAddress} onChange={e => setBranchAddress(e.target.value)} placeholder="e.g. Shivaji Road Main Lane"/>
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowAddBranch(false)}>Cancel</button>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={addBranch}>Establish Branch</button>
          </div>
        </Modal>
      )}
      {editAgent && (
        <Modal title={`Identity Configuration: ${editAgent.name}`} onClose={() => setEditAgent(null)}>
          <EditUserModal user={user} agent={editAgent} branches={branches} token={token} onSuccess={async () => { await new Promise(r => setTimeout(r,300)); await fetchAll(); }} onClose={() => setEditAgent(null)} />
        </Modal>
      )}
      {selectedCustomer && (
        <Modal title="Institutional Dossier" onClose={() => setSelectedCustomer(null)} maxWidth={640}>
          <CustomerProfileModal customer={selectedCustomer} token={token} onSuccess={fetchAll} onClose={() => setSelectedCustomer(null)} />
        </Modal>
      )}
      <LocalChatbot 
        activeTab={tab}
        setActiveTab={setTab}
        users={agents}
        customers={customers}
        branches={branches}
        stats={stats}
        setEditAgent={setEditAgent}
        setSelectedCustomer={setSelectedCustomer}
        token={token}
        fetchAll={fetchAll}
        setSearch={setSearch}
        setCustSearch={setCustSearch}
      />
    </>
  );
}