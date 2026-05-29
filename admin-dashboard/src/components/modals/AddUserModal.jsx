import { useState } from 'react';
import axios from 'axios';
import { G } from '../../theme';

export default function AddUserModal({ onClose, branches, authH, fetchAll, user }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // <-- NEW STATE
  const [role, setRole] = useState('AGENT');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 👇 Include phoneNumber in the payload 👇
      await axios.post('http://localhost:8085/api/users', {
        name, email, password, phoneNumber, role, branchId, tenantId: user.tenantId || 1
      }, authH);
      fetchAll();
      onClose();
    } catch (err) {
      alert("Failed to create user. Email might exist.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:30, width:400 }}>
        <h3 style={{ marginBottom:20, fontFamily:'var(--font-display)', fontSize:20 }}>Add System User</h3>
        <form onSubmit={handleSubmit}>
          <input required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />

          <input required type="email" placeholder="Email (Login ID)" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />

          {/* 👇 NEW PHONE NUMBER INPUT 👇 */}
          <input required type="tel" placeholder="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />

          <input required type="password" placeholder="Temporary Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }} />

          <select value={role} onChange={e => setRole(e.target.value)} style={{ width:'100%', padding:12, marginBottom:12, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }}>
            <option value="AGENT">Field Agent</option>
            <option value="MANAGER">Branch Manager</option>
            {user?.role === 'ADMIN' && <option value="ADMIN">Company Admin</option>}
          </select>

          {(role === 'AGENT' || role === 'MANAGER') && (
            <select required value={branchId} onChange={e => setBranchId(e.target.value)} style={{ width:'100%', padding:12, marginBottom:24, background:G.surface, border:`1px solid ${G.border}`, color:'#fff', borderRadius:6 }}>
              <option value="" disabled>Assign to Branch...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <div style={{ display:'flex', gap:10, marginTop: role === 'ADMIN' ? 12 : 0 }}>
            <button type="button" style={{ flex:1, background:'transparent', color:G.textSub, border:`1px solid ${G.border}`, padding:10, borderRadius:6, cursor:'pointer' }} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex:1, background:G.accent, color:'#000', border:'none', padding:10, borderRadius:6, fontWeight:'bold', cursor:'pointer' }}>
              {loading ? 'Saving...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}