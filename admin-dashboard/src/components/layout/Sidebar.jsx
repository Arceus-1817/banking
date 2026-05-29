// src/components/layout/Sidebar.jsx
import { G } from '../../theme';

export default function Sidebar({ user, currentTab, setTab, clock, handleLogout, customerCount, tabs }) {
  return (
    <aside style={{ width:220, flexShrink:0, background:G.surface, borderRight:`1px solid ${G.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Logo ── */}
      <div style={{ padding:'22px 20px 18px', borderBottom:`1px solid ${G.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:G.accentBg, border:`1px solid ${G.accent}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>₿</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, color:G.text, letterSpacing:'-.01em' }}>PigmyPay</div>
            <div style={{ fontSize:10, color:G.textSub, letterSpacing:'.05em' }}>COMMAND CENTER</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ padding:'12px 10px', flex:1 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px', borderRadius:9, marginBottom:2,
            background: currentTab === t.id ? G.accentBg : 'transparent',
            border: currentTab === t.id ? `1px solid ${G.accent}33` : '1px solid transparent',
            color: currentTab === t.id ? G.accent : G.textSub,
            fontSize:13, textAlign:'left', cursor:'pointer', transition:'all .15s',
          }}
          onMouseEnter={e => { if(currentTab !== t.id) e.currentTarget.style.color = G.text; }}
          onMouseLeave={e => { if(currentTab !== t.id) e.currentTarget.style.color = G.textSub; }}>
            <span style={{ fontSize:14, opacity:.8 }}>{t.icon}</span>
            {t.label}
            {t.id === 'customers' && customerCount > 0 && (
              <span style={{ marginLeft:'auto', background:G.accentBg, color:G.accent, fontSize:10, padding:'2px 7px', borderRadius:10, border:`1px solid ${G.accent}33` }}>{customerCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── User Card ── */}
      <div style={{ margin:10, padding:'12px 14px', background:G.card, border:`1px solid ${G.border}`, borderRadius:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:G.accentBg, border:`1px solid ${G.accent}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:G.accent, fontFamily:'var(--font-display)' }}>
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500, color:G.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize:10, color:G.textSub }}>{user?.role}</div>
          </div>
        </div>
        <div style={{ fontSize:10, color:G.muted, marginBottom:10, letterSpacing:'.03em' }}>
          {clock.toLocaleTimeString('en-IN', { hour12:false })}
        </div>
        <button className="btn-danger" style={{ width:'100%', fontSize:11, padding:'7px' }} onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
  );
}