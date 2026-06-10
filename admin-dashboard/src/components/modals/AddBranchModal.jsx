import { useState } from 'react';
import axios from 'axios';
import { G } from '../../theme';

export default function AddBranchModal({ onClose, authH, fetchAll, user }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Send tenantId from the logged-in user
      await axios.post('http://localhost:8085/api/branches', {
        name,
        code,
        tenantId: user.tenantId || 1
      }, authH);
      fetchAll();
      onClose();
    } catch (_err) {
      alert("Failed to create branch");
    }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:30, width:400 }}>
        <h3 style={{ marginBottom:20, fontFamily:'var(--font-display)', fontSize:20 }}>Create New Branch</h3>
        <form onSubmit={handleSubmit}>
          <input required placeholder="Branch Name (e.g. MG Road)" value={name} onChange={e => setName(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />
          <input required placeholder="Branch Code (e.g. MGR-01)" value={code} onChange={e => setCode(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:24, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" style={{ flex:1, background:'transparent', color:G.textSub, border:`1px solid ${G.border}`, padding:10, borderRadius:6, cursor:'pointer' }} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex:1, background:G.info, color:'#000', border:'none', padding:10, borderRadius:6, fontWeight:'bold', cursor:'pointer' }}>
              {loading ? 'Saving...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}