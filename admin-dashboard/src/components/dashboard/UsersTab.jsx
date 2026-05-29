import { useState } from 'react';
import { G } from '../../theme';

const colors = ['#00ff88','#8b5cf6','#3b82f6','#ffa502','#ff4757','#06b6d4'];
function initials(name = 'NA') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function UsersTab({ agents, setShowAddAgent, setEditAgent }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter(a =>
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="fade-up" style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, letterSpacing:'-.02em' }}>System Users</h1>
          <p style={{ color:G.textSub, fontSize:12, marginTop:4 }}>Manage admins, managers, and field agents.</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input
            type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding:'10px 14px', borderRadius:8, border:`1px solid ${G.border}`, background:G.surface, color:G.text, fontSize:13, width:260, outline:'none' }}
          />
          <button className="btn-primary" onClick={() => setShowAddAgent(true)}>+ Add User</button>
        </div>
      </div>

      <div className="fade-up-1" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px', gap:16, padding:'14px 20px', background:G.surface, borderBottom:`1px solid ${G.border}`, fontSize:11, fontWeight:600, color:G.textSub, textTransform:'uppercase', letterSpacing:'.05em' }}>
          <div>User Identity</div>
          <div>System Role</div>
          <div>Branch Assignment</div>
          <div style={{ textAlign:'right' }}>Actions</div>
        </div>
        {filteredAgents.length === 0 ? <div style={{ padding:60, textAlign:'center', color:G.muted, fontSize:13 }}>No users match your search.</div> :
          <div style={{ display:'flex', flexDirection:'column' }}>
            {filteredAgents.map((a, i) => (
              <div key={a.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px', gap:16, padding:'16px 20px', borderBottom: i === filteredAgents.length-1 ? 'none' : `1px solid ${G.border}`, alignItems:'center', transition:'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background=`${G.surface}88`} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${colors[i%colors.length]}22`, color:colors[i%colors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>{initials(a.name)}</div>
                  <div>
                    <div style={{ fontWeight:600, color:G.text, fontSize:13 }}>{a.name}</div>
                    <div style={{ fontSize:11, color:G.textSub, marginTop:2 }}>{a.email}</div>
                  </div>
                </div>
                <div><span className="tag" style={{ background:`${G.accent}15`, color:G.accent, border:`1px solid ${G.accent}33` }}>{a.role}</span></div>
                <div style={{ fontSize:12, color:G.text }}>{a.branch?.name || <span style={{ color:G.warn }}>Head Office</span>}</div>
                <div style={{ textAlign:'right' }}><button className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }} onClick={() => setEditAgent(a)}>Manage</button></div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}