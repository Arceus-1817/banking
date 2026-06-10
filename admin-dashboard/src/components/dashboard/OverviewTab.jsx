import { useState, useEffect } from 'react';
import { G } from '../../theme';

// ─── Local Helpers & Components (We will consolidate these later) ────────────
const fmt  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtR = (n) => `₹${fmt(n)}`;
const colors = ['#00ff88','#8b5cf6','#3b82f6','#ffa502','#ff4757','#06b6d4'];

function initials(name = 'NA') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function SparkBar({ data = [], color = '#00ff88', height = 36 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex:1, minHeight:3, borderRadius:'3px 3px 0 0',
          height:`${(v / max) * 100}%`,
          background: i === data.length - 1 ? color : `${color}55`,
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

function StatCard({ label, value, prefix = '', sub, spark, color = '#00ff88', icon, delay = 1 }) {
  return (
    <div className={`fade-up-${delay}`} style={{
      background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg,
      padding:'22px 24px', display:'flex', flexDirection:'column', gap:12,
      position:'relative', overflow:'hidden', transition:'border-color .2s, box-shadow .2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = G.borderHi; e.currentTarget.style.boxShadow='0 0 30px rgba(0,0,0,.5)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.boxShadow='none'; }}>
      <div style={{ position:'absolute', top:0, right:0, width:60, height:60, background:`radial-gradient(circle at top right,${color}18,transparent 70%)`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:11, color:G.textSub, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</span>
        {icon && <span style={{ width:32, height:32, borderRadius:8, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:28, fontFamily:'var(--font-display)', fontWeight:700, color:G.text, lineHeight:1 }}>
        <AnimCount value={value} prefix={prefix} />
      </div>
      {sub && <div style={{ fontSize:11, color:G.textSub }}>{sub}</div>}
      {spark && <SparkBar data={spark} color={color} height={36} />}
    </div>
  );
}

// ─── Main Tab Component ──────────────────────────────────────────────────────
export default function OverviewTab({
  user, clock, stats, agents, customers, branches, activity, loading,
  setTab, setShowAddAgent, setShowAddBranch, setEditAgent
}) {
  const SPARK = [42,38,55,61,48,72,68,80,75,90,88,95];
  const hour  = clock.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div>
      <div className="fade-up" style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, letterSpacing:'-.02em' }}>
          Good {greeting}, {(user?.name || 'Admin').split(' ')[0]}
        </h1>
        <p style={{ color:G.textSub, fontSize:13, marginTop:5 }}>
          {clock.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:16, marginBottom:28 }}>
        <StatCard label="Field agents"       value={stats?.agentCount    ?? agents.filter(a=>a.role==='AGENT').length} sub="Active collectors"   spark={SPARK}               color={G.accent}  icon="👤" delay={1} />
        <StatCard label="Total customers"    value={stats?.customerCount ?? customers.length} sub="Across all branches"  spark={SPARK.map(v=>v*.8)}  color={G.info}    icon="🧾" delay={2} />
        <StatCard label="Today's collection" value={stats?.todayCollection??0} prefix="₹" sub={`${stats?.todayTxnCount??0} transactions today`} spark={SPARK.map(v=>v*.9)} color={G.warn} icon="💰" delay={3}/>
        <StatCard label="Total portfolio"    value={stats?.totalPortfolio ?? 0} prefix="₹" sub="Cumulative balance"  spark={SPARK.map(v=>v*.85)} color={G.purple} icon="📊" delay={4}/>
        <StatCard label="Branches"           value={stats?.branchCount   ?? branches.length} sub="Active locations"    spark={SPARK.map(v=>v*.6)}  color="#06b6d4"   icon="🏢" delay={5} />
      </div>

      {/* Lower grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
        {/* Recent users */}
        <div className="fade-up-3" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Recent users</div>
              <div style={{ fontSize:11, color:G.textSub, marginTop:2 }}>Last onboarded</div>
            </div>
            <button className="btn-primary" style={{ fontSize:11, padding:'7px 14px' }} onClick={() => setShowAddAgent(true)}>+ Add user</button>
          </div>
          {loading
            ? <div style={{ padding:20 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52, marginBottom:10 }}/>)}</div>
            : agents.length === 0
              ? <div style={{ padding:40, textAlign:'center', color:G.muted, fontSize:13 }}>No users yet.</div>
              : agents.slice(0,5).map((a,i) => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:`1px solid ${G.border}` }}>
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${colors[i%colors.length]}22`, color:colors[i%colors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600 }}>{initials(a.name)}</div>
                      <div><div style={{ fontSize:13, color:G.text }}>{a.name}</div><div style={{ fontSize:11, color:G.textSub }}>{a.role}</div></div>
                    </div>
                    <button className="btn-ghost" style={{ padding:'4px 10px', fontSize:10 }} onClick={() => setEditAgent(a)}>Edit</button>
                  </div>
                ))
          }
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="fade-up-4" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:20 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, marginBottom:14 }}>Quick actions</div>
            {[
              { label:'Add field agent',  icon:'👤', color:G.accent,  action:() => setShowAddAgent(true)  },
              { label:'Create branch',    icon:'🏢', color:G.info,    action:() => setShowAddBranch(true) },
              { label:'View customers',   icon:'🧾', color:G.purple,  action:() => setTab('customers')    },
              { label:'View analytics',   icon:'📊', color:G.warn,    action:() => setTab('analytics')    },
            ].map(q => (
              <button key={q.label} onClick={q.action} style={{ display:'flex', alignItems:'center', gap:10, background:G.surface, border:`1px solid ${G.border}`, borderRadius:9, padding:'11px 14px', color:G.text, fontSize:12, cursor:'pointer', transition:'all .15s', textAlign:'left', width:'100%', marginBottom:8 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=`${q.color}44`; e.currentTarget.style.background=`${q.color}08`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=G.border; e.currentTarget.style.background=G.surface; }}>
                <span style={{ fontSize:14 }}>{q.icon}</span>{q.label}
                <span style={{ marginLeft:'auto', color:G.muted, fontSize:14 }}>›</span>
              </button>
            ))}
          </div>

          <div className="fade-up-5" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:20, flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, marginBottom:14 }}>Live activity</div>
            {activity.length > 0 ? activity.map((t,i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:`1px solid ${G.border}` }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:`${G.accent}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>💳</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:G.text }}>
                    {t.customer?.name || 'Customer'} — <span style={{ color:G.accent }}>{fmtR(t.amount)}</span>
                  </div>
                  <div style={{ fontSize:11, color:G.muted, marginTop:2 }}>
                    {t.agent?.name || 'Agent'} · {t.paymentMode || 'CASH'}
                  </div>
                </div>
                <div style={{ fontSize:10, color:G.muted, flexShrink:0 }}>
                  {new Date(t.transactionDate).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            )) : (
              <>
                <div style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:`1px solid ${G.border}` }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:`${G.accent}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✅</div>
                  <div><div style={{ fontSize:12, color:G.text }}>System online</div><div style={{ fontSize:11, color:G.muted }}>All services healthy</div></div>
                </div>
                <div style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:`1px solid ${G.border}` }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:`${G.info}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🔐</div>
                  <div><div style={{ fontSize:12, color:G.text }}>Admin login: {user?.name}</div><div style={{ fontSize:11, color:G.muted }}>{clock.toLocaleTimeString('en-IN')}</div></div>
                </div>
                <div style={{ display:'flex', gap:10, padding:'10px 0' }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:`${G.purple}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>📡</div>
                  <div><div style={{ fontSize:12, color:G.text }}>No transactions today yet</div><div style={{ fontSize:11, color:G.muted }}>Activity will appear here</div></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}