import { G } from '../../theme';

const fmtR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function BranchesTab({ branches, stats, setShowAddBranch }) {
  return (
    <div>
      <div className="fade-up" style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, letterSpacing:'-.02em' }}>Branch Network</h1>
          <p style={{ color:G.textSub, fontSize:12, marginTop:4 }}>Manage physical locations and regional metrics.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddBranch(true)}>+ Create Branch</button>
      </div>

      <div className="fade-up-1" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20 }}>
        {branches.length === 0 ? <div style={{ gridColumn:'1/-1', padding:60, textAlign:'center', color:G.muted, background:G.card, border:`1px dashed ${G.border}`, borderRadius:G.rLg }}>No branches configured yet.</div> :
          branches.map(b => (
            <div key={b.id} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:24, position:'relative', overflow:'hidden', transition:'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 10px 30px rgba(0,0,0,.5)`; e.currentTarget.style.borderColor=G.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=G.border; }}>
              <div style={{ position:'absolute', top:0, left:0, bottom:0, width:4, background:G.info }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <h3 style={{ fontSize:18, fontWeight:700, color:G.text, fontFamily:'var(--font-display)', letterSpacing:'-.01em' }}>{b.name}</h3>
                  <div style={{ fontSize:11, color:G.textSub, marginTop:4 }}>Code: {b.code}</div>
                </div>
                <div style={{ width:36, height:36, borderRadius:10, background:`${G.info}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏢</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                <div style={{ background:G.surface, padding:12, borderRadius:8, border:`1px solid ${G.border}` }}>
                  <div style={{ fontSize:10, color:G.textSub, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Agents</div>
                  <div style={{ fontSize:18, fontWeight:700, color:G.text }}>{stats?.agentsPerBranch?.[b.id] || 0}</div>
                </div>
                <div style={{ background:G.surface, padding:12, borderRadius:8, border:`1px solid ${G.border}` }}>
                  <div style={{ fontSize:10, color:G.textSub, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Customers</div>
                  <div style={{ fontSize:18, fontWeight:700, color:G.text }}>{stats?.customersPerBranch?.[b.id] || 0}</div>
                </div>
              </div>
              <button className="btn-ghost" style={{ width:'100%', fontSize:12, padding:'8px', background:G.surface }}>Manage Settings</button>
            </div>
          ))}
      </div>
    </div>
  );
}