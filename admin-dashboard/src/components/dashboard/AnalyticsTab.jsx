import { useState, useEffect } from 'react';
import { G } from '../../theme';



function SparkBar({ data = [], color = '#00ff88', height = 36 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex:1, minHeight:3, borderRadius:'3px 3px 0 0', height:`${(v / max) * 100}%`, background: i === data.length - 1 ? color : `${color}55`, transition:'height .4s ease' }}/>
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
    const t = setInterval(() => { s = Math.min(s + step, end); setDisp(Math.floor(s)); if (s >= end) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, [value, dur]);
  return <>{prefix}{disp.toLocaleString('en-IN')}</>;
}

function StatCard({ label, value, prefix = '', sub, spark, color = '#00ff88', icon, delay = 1 }) {
  return (
    <div className={`fade-up-${delay}`} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:'22px 24px', display:'flex', flexDirection:'column', gap:12, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, right:0, width:60, height:60, background:`radial-gradient(circle at top right,${color}18,transparent 70%)`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:11, color:G.textSub, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</span>
        {icon && <span style={{ width:32, height:32, borderRadius:8, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:28, fontFamily:'var(--font-display)', fontWeight:700, color:G.text, lineHeight:1 }}><AnimCount value={value} prefix={prefix} /></div>
      {sub && <div style={{ fontSize:11, color:G.textSub }}>{sub}</div>}
      {spark && <SparkBar data={spark} color={color} height={36} />}
    </div>
  );
}

export default function AnalyticsTab({ stats, activity: _activity }) {
  const SPARK = [42,38,55,61,48,72,68,80,75,90,88,95];

  return (
    <div>
      <div className="fade-up" style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, letterSpacing:'-.02em' }}>Analytics & Reports</h1>
        <p style={{ color:G.textSub, fontSize:12, marginTop:4 }}>Deep dive into your financial metrics.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, marginBottom:20 }}>
        <StatCard label="Total portfolio"    value={stats?.totalPortfolio ?? 0} prefix="₹" sub="Cumulative balance"  spark={SPARK} color={G.purple} icon="📊" delay={1}/>
        <StatCard label="Today's collection" value={stats?.todayCollection??0} prefix="₹" sub={`${stats?.todayTxnCount??0} transactions today`} spark={SPARK.map(v=>v*.9)} color={G.warn} icon="💰" delay={2}/>
        <StatCard label="Avg. Deposit"       value={(stats?.todayCollection || 0) / (stats?.todayTxnCount || 1)} prefix="₹" sub="Per transaction" spark={SPARK.map(v=>v*.6)} color={G.info} icon="📈" delay={3}/>
      </div>

      <div className="fade-up-4" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, minHeight:300, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
         <div style={{ fontSize:40, marginBottom:10 }}>📉</div>
         <h3 style={{ fontSize:16, color:G.text }}>Advanced Charts Locked</h3>
         <p style={{ color:G.muted, fontSize:13, marginTop:8 }}>Upgrade to PigmyPay Enterprise to unlock predictive forecasting.</p>
         <button className="btn-primary" style={{ marginTop:20 }}>Upgrade Plan</button>
      </div>
    </div>
  );
}