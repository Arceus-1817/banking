// import { useState, useEffect, useCallback } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import AdminDashboard from './AdminDashboard';
// import SuperAdminDashboard from './SuperAdminDashboard';
// import './index.css';
//
// const BASE_URL = 'http://localhost:8085';
// const api = axios.create({ baseURL: BASE_URL });
//
// // ═══════════════════════════════════════════════════════════════════════════════
// // 1. LANDING PAGE (Institutional Wealth Theme)
// // ═══════════════════════════════════════════════════════════════════════════════
// function LandingPage() {
//   const navigate = useNavigate();
//   const [mounted, setMounted] = useState(false);
//
//   useEffect(() => {
//     const t = setTimeout(() => setMounted(true), 50);
//     return () => clearTimeout(t);
//   }, []);
//
//   const features = [
//     { icon: '⚡', title: 'High-Velocity Collections', desc: 'Optimized ledger logging for field agents operating in high-density markets.' },
//     { icon: '🏛️', title: 'Bank-Grade Vault Security', desc: 'Stateless JWT architecture with cryptographic multi-tenant blast walls.' },
//     { icon: '📊', title: 'Real-Time Oversight', desc: 'Branch managers monitor portfolio liquidity and agent risk limits live.' },
//     { icon: '📡', title: 'Satellite Synchronization', desc: 'Asynchronous offline batching ensures zero data loss in remote areas.' },
//   ];
//
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap');
//         .lp-body { font-family: 'Inter', sans-serif; background: #0A1128; color: #FFFFFF; min-height: 100vh; overflow-x: hidden; }
//         .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 6vw; height: 80px; display: flex; align-items: center; justify-content: space-between; background: rgba(10, 17, 40, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(212, 175, 55, 0.15); }
//         .lp-logo { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; }
//         .lp-logo span { color: #D4AF37; font-style: italic; }
//         .lp-hero { padding: 180px 6vw 120px; max-width: 1280px; margin: 0 auto; position: relative; }
//         .lp-hero::after { content: ''; position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%); z-index: 0; pointer-events: none; }
//         .lp-eyebrow { display: inline-flex; align-items: center; gap: 10px; color: #D4AF37; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 30px; border: 1px solid rgba(212, 175, 55, 0.3); padding: 6px 16px; border-radius: 4px; }
//         .lp-h1 { font-family: 'Playfair Display', serif; font-size: clamp(48px, 6vw, 84px); line-height: 1.1; color: #FFFFFF; margin-bottom: 28px; position: relative; z-index: 1; }
//         .lp-h1 em { color: #D4AF37; font-style: italic; }
//         .lp-sub { font-size: clamp(16px, 2vw, 18px); color: #A0ABC0; line-height: 1.7; max-width: 600px; margin-bottom: 48px; font-weight: 300; }
//         .lp-btn-main { background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%); color: #0A1128; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; padding: 16px 36px; border-radius: 4px; border: none; cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(212, 175, 55, 0.2); }
//         .lp-btn-main:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(212, 175, 55, 0.3); }
//         .lp-btn-sec { background: transparent; color: #FFFFFF; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 14px; padding: 15px 36px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.3); cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; }
//         .lp-btn-sec:hover { border-color: #D4AF37; color: #D4AF37; background: rgba(212, 175, 55, 0.05); }
//         .lp-features { background: #FFFFFF; color: #0A1128; padding: 120px 6vw; position: relative; }
//         .lp-feat-head { font-family: 'Playfair Display', serif; font-size: clamp(36px, 4vw, 56px); margin-bottom: 60px; text-align: center; }
//         .lp-feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; max-width: 1280px; margin: 0 auto; }
//         .lp-feat-card { border-left: 2px solid #E2E8F0; padding-left: 24px; transition: border-color 0.3s; }
//         .lp-feat-card:hover { border-color: #D4AF37; }
//         .lp-feat-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; font-family: 'Playfair Display', serif; }
//         .lp-feat-desc { font-size: 15px; color: #4A5568; line-height: 1.6; font-weight: 300; }
//         @keyframes lp-fadein { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
//         .lp-anim { opacity: 0; }
//         .lp-anim.in { animation: lp-fadein 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
//       `}</style>
//
//       <div className="lp-body">
//         <nav className="lp-nav">
//           <div className="lp-logo">Pigmy<span>Pay</span></div>
//           <button className="lp-btn-sec" style={{ padding:'10px 24px', fontSize:12 }} onClick={() => navigate('/login')}>Secure Login</button>
//         </nav>
//
//         <section className="lp-hero">
//           <div className={`lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.1s' }}>
//             <div className="lp-eyebrow">Enterprise Core Banking</div>
//           </div>
//           <h1 className={`lp-h1 lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.2s' }}>
//             Wealth management,<br /><em>decentralized.</em>
//           </h1>
//           <p className={`lp-sub lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.3s' }}>
//             The premier satellite banking infrastructure for micro-finance. Equip your field agents with institutional-grade ledger tools and offline synchronization.
//           </p>
//           <div className={`lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.4s', display:'flex', gap:'20px', flexWrap:'wrap' }}>
//             <button className="lp-btn-main" onClick={() => navigate('/login')}>Access Corporate Portal</button>
//             <button className="lp-btn-sec" onClick={() => alert('Contacting platform administration...')}>Request Audit</button>
//           </div>
//         </section>
//
//         <section className="lp-features">
//           <h2 className="lp-feat-head">Institutional Architecture</h2>
//           <div className="lp-feat-grid">
//             {features.map(f => (
//               <div key={f.title} className="lp-feat-card">
//                 <div style={{ fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
//                 <div className="lp-feat-title">{f.title}</div>
//                 <div className="lp-feat-desc">{f.desc}</div>
//               </div>
//             ))}
//           </div>
//         </section>
//       </div>
//     </>
//   );
// }
//
// // ═══════════════════════════════════════════════════════════════════════════════
// // 2. LOGIN PAGE (Corporate Vault Theme)
// // ═══════════════════════════════════════════════════════════════════════════════
// function LoginPage({ setUser }) {
//   const [email, setEmail]       = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading]   = useState(false);
//   const [error, setError]       = useState('');
//   const navigate = useNavigate();
//
//   const handleLogin = async () => {
//     if (!email || !password) { setError('Credentials required.'); return; }
//     setLoading(true); setError('');
//     try {
//       const res = await api.post('/api/auth/login', { email, password });
//       setUser(res.data);
//       if (res.data.role === 'SYSTEM_ADMIN') navigate('/superadmin');
//       else if (res.data.role === 'ADMIN' || res.data.role === 'MANAGER') navigate('/admin');
//       else navigate('/agent');
//     } catch (e) {
//       setError(e.response?.data?.error || 'Authentication failed. Unauthorized access logged.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <>
//       <style>{`
//         .login-wrap { min-height: 100vh; display: flex; background: #0A1128; font-family: 'Inter', sans-serif; }
//         .login-left { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
//         .login-card { width: 100%; max-width: 380px; background: #FFFFFF; padding: 48px; border-radius: 8px; box-shadow: 0 24px 48px rgba(0,0,0,0.4); z-index: 1; }
//         .login-logo { font-family: 'Playfair Display', serif; font-size: 28px; color: #0A1128; font-weight: 700; margin-bottom: 8px; text-align: center; }
//         .login-logo span { color: #D4AF37; font-style: italic; }
//         .login-sub { text-align: center; color: #718096; font-size: 13px; margin-bottom: 40px; letter-spacing: 0.5px; }
//         .login-input { width: 100%; padding: 14px 16px; background: #F8F9FA; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 20px; }
//         .login-input:focus { border-color: #D4AF37; background: #FFFFFF; }
//         .login-btn { width: 100%; padding: 16px; background: #0A1128; color: #FFFFFF; font-weight: 600; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
//         .login-btn:hover:not(:disabled) { background: #D4AF37; color: #0A1128; }
//         .login-error { color: #E53E3E; font-size: 13px; text-align: center; margin-bottom: 16px; font-weight: 500; padding: 10px; background: #FFF5F5; border-radius: 4px; }
//       `}</style>
//       <div className="login-wrap">
//         <div className="login-left">
//           <div className="login-card">
//             <div className="login-logo">Pigmy<span>Pay</span></div>
//             <div className="login-sub">SECURE PORTAL ACCESS</div>
//             {error && <div className="login-error">{error}</div>}
//             <input className="login-input" type="email" placeholder="Corporate Email" value={email} onChange={e => setEmail(e.target.value)} />
//             <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
//             <button className="login-btn" onClick={handleLogin} disabled={loading}>{loading ? 'Verifying Identity...' : 'Authenticate'}</button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
//
// // ═══════════════════════════════════════════════════════════════════════════════
// // 3. AGENT DASHBOARD (High Contrast Ledger Theme)
// // ═══════════════════════════════════════════════════════════════════════════════
// function AgentDashboard({ user, handleLogout }) {
//   const [customers, setCustomers]           = useState([]);
//   const [selectedCustomer, setSelected]     = useState(null);
//   const [depositAmount, setDepositAmount]   = useState('');
//   const [paymentMode, setPaymentMode]       = useState('CASH');
//   const [txCategory, setTxCategory]         = useState('SAVINGS_DEPOSIT');
//   const [transactions, setTransactions]     = useState([]);
//   const [status, setStatus]                 = useState({ type:'', message:'' });
//   const [loading, setLoading]               = useState(true);
//
//   const getAuth = () => ({ headers: { Authorization: `Bearer ${user.token}` } });
//
//   const fetchRoute = async () => {
//     try {
//       const res = await api.get('/api/routes/my-daily-route', getAuth());
//       setCustomers(Array.isArray(res.data) ? res.data : []);
//     } catch (e) {
//       if (e.response?.status === 401) handleLogout();
//     } finally { setLoading(false); }
//   };
//
//   useEffect(() => { fetchRoute(); }, []);
//
//   const handleSelectCustomer = async (c) => {
//     setSelected(c);
//     setStatus({ type:'', message:'' });
//
//     // Auto-fill logic based on Satellite Data
//     if (c.activeMonthlyEmi > 0) {
//       setTxCategory('LOAN_REPAYMENT');
//       setDepositAmount(c.activeMonthlyEmi);
//     } else {
//       setTxCategory('SAVINGS_DEPOSIT');
//       setDepositAmount('');
//     }
//
//     try {
//       const txRes = await api.get(`/api/transactions/history/${c.id}`, getAuth());
//       setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
//     } catch (e) {
//       setTransactions([]);
//     }
//   };
//
//   const handleDeposit = async () => {
//     if (!depositAmount || parseFloat(depositAmount) <= 0) return;
//     try {
//       const payload = { customerId: selectedCustomer.id, amount: parseFloat(depositAmount), paymentMode, transactionCategory: txCategory };
//       const endpoint = txCategory === 'LOAN_REPAYMENT' ? '/api/transactions/loan-emi' : '/api/transactions/deposit';
//
//       await api.post(endpoint, payload, getAuth());
//       setStatus({ type:'success', message:`Payment of ₹${depositAmount} verified and logged.` });
//       setDepositAmount('');
//
//       // Silent refresh
//       const txRes = await api.get(`/api/transactions/history/${selectedCustomer.id}`, getAuth());
//       setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
//       fetchRoute(); // Updates the overall balance in the sidebar
//     } catch (e) {
//       setStatus({ type:'error', message: e.response?.data?.message || e.response?.data || 'Transaction rejected.' });
//     }
//   };
//
//   const totalPortfolio = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
//
//   return (
//     <>
//       <style>{`
//         .ag-wrap { min-height: 100vh; background: #F3F4F6; color: #0A1128; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; }
//         .ag-header { background: #0A1128; color: #FFFFFF; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #D4AF37; flex-shrink: 0; }
//         .ag-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; }
//         .ag-logo span { color: #D4AF37; font-style: italic; }
//         .ag-main { display: flex; flex: 1; overflow: hidden; }
//
//         /* SIDEBAR (Route List) */
//         .ag-sidebar { width: 380px; background: #FFFFFF; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; }
//         .ag-portfolio { padding: 24px; border-bottom: 1px solid #E2E8F0; background: #F8F9FA; }
//         .ag-port-label { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
//         .ag-port-value { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #0A1128; }
//         .ag-list { overflow-y: auto; flex: 1; }
//         .ag-item { padding: 16px 24px; border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; display: flex; justify-content: space-between; align-items: center; }
//         .ag-item:hover { background: #F8F9FA; }
//         .ag-item.active { background: #FDFBF5; border-left-color: #D4AF37; }
//         .ag-item-name { font-weight: 600; font-size: 14px; color: #0A1128; margin-bottom: 4px; }
//         .ag-item-acc { font-size: 12px; color: #718096; font-family: monospace; }
//         .ag-item-bal { font-weight: 600; font-size: 14px; color: #2F855A; }
//         .ag-item-emi { font-size: 11px; color: #D69E2E; font-weight: 600; margin-top: 4px; background: rgba(214,158,46,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; }
//
//         /* RIGHT PANEL (Ledger) */
//         .ag-content { flex: 1; padding: 40px; overflow-y: auto; background: #F3F4F6; }
//         .ag-card { background: #FFFFFF; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 32px; max-width: 800px; margin: 0 auto; border-top: 4px solid #0A1128; }
//         .ag-customer-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0; }
//         .ag-c-name { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #0A1128; margin-bottom: 8px; }
//         .ag-c-info { color: #4A5568; font-size: 13px; display: flex; gap: 16px; }
//
//         .ag-input-group { margin-bottom: 24px; }
//         .ag-label { display: block; font-size: 12px; font-weight: 600; color: #4A5568; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
//         .ag-input { width: 100%; padding: 16px; font-size: 24px; border: 1px solid #E2E8F0; border-radius: 4px; outline: none; font-weight: 600; color: #0A1128; transition: border 0.2s; }
//         .ag-input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
//
//         .ag-toggles { display: flex; gap: 12px; margin-bottom: 24px; }
//         .ag-toggle { flex: 1; padding: 12px; text-align: center; border: 1px solid #E2E8F0; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; color: #718096; transition: all 0.2s; }
//         .ag-toggle.active { background: #0A1128; color: #FFFFFF; border-color: #0A1128; }
//
//         .ag-btn { width: 100%; padding: 18px; background: #D4AF37; color: #0A1128; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; }
//         .ag-btn:hover { background: #C5A880; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,175,55,0.3); }
//
//         .ag-tx-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #EDF2F7; }
//         .ag-tx-amt { font-weight: 600; color: #0A1128; font-size: 15px; }
//         .ag-tx-date { font-size: 12px; color: #718096; }
//         .ag-tx-badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: 600; letter-spacing: 0.5px; }
//         .bg-savings { background: #E6FFFA; color: #276749; }
//         .bg-loan { background: #FEFCBF; color: #975A16; }
//
//         .alert-ok { padding: 16px; background: #F0FFF4; border-left: 4px solid #38A169; color: #22543D; font-weight: 500; font-size: 14px; margin-bottom: 24px; }
//         .alert-err { padding: 16px; background: #FFF5F5; border-left: 4px solid #E53E3E; color: #9B2C2C; font-weight: 500; font-size: 14px; margin-bottom: 24px; }
//       `}</style>
//
//       <div className="ag-wrap">
//         <header className="ag-header">
//           <div className="ag-logo">Pigmy<span>Pay</span> <span style={{fontSize:12, color:'#A0ABC0', fontFamily:'Inter', fontStyle:'normal'}}>| Field Ledger</span></div>
//           <div style={{ display:'flex', alignItems:'center', gap: 24 }}>
//             <span style={{ fontSize: 13, color: '#E2E8F0' }}>Agent: <strong>{user.name}</strong></span>
//             <button onClick={handleLogout} style={{ background:'transparent', border:'1px solid #4A5568', color:'#FFFFFF', padding:'6px 12px', borderRadius:4, cursor:'pointer', fontSize:12 }}>Sign Out</button>
//           </div>
//         </header>
//
//         <div className="ag-main">
//           {/* SIDEBAR: ROUTE LIST */}
//           <div className="ag-sidebar">
//             <div className="ag-portfolio">
//               <div className="ag-port-label">Route Liquidity</div>
//               <div className="ag-port-value">₹{totalPortfolio.toLocaleString('en-IN')}</div>
//               <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>{customers.length} Accounts Assigned</div>
//             </div>
//             <div className="ag-list">
//               {loading ? <div style={{padding:24, color:'#718096', textAlign:'center'}}>Fetching encrypted route...</div> :
//                customers.map(c => (
//                 <div key={c.id} className={`ag-item ${selectedCustomer?.id === c.id ? 'active' : ''}`} onClick={() => handleSelectCustomer(c)}>
//                   <div>
//                     <div className="ag-item-name">{c.name}</div>
//                     <div className="ag-item-acc">{c.accountNumber}</div>
//                     {c.activeMonthlyEmi > 0 && <div className="ag-item-emi">EMI DUE: ₹{c.activeMonthlyEmi}</div>}
//                   </div>
//                   <div className="ag-item-bal">₹{(c.currentBalance || 0).toLocaleString()}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//
//           {/* MAIN PANEL: TRANSACTION CAPTURE */}
//           <div className="ag-content">
//             {selectedCustomer ? (
//               <div className="ag-card">
//                 <div className="ag-customer-header">
//                   <div>
//                     <div className="ag-c-name">{selectedCustomer.name}</div>
//                     <div className="ag-c-info">
//                       <span>A/C: {selectedCustomer.accountNumber}</span>
//                       {selectedCustomer.phoneNumber && <span>| Ph: {selectedCustomer.phoneNumber}</span>}
//                     </div>
//                   </div>
//                   <div style={{ textAlign: 'right' }}>
//                     <div className="ag-port-label">Current Balance</div>
//                     <div style={{ fontSize: 24, fontWeight: 700, color: '#2F855A' }}>₹{(selectedCustomer.currentBalance || 0).toLocaleString()}</div>
//                   </div>
//                 </div>
//
//                 {status.message && (
//                   <div className={status.type === 'success' ? 'alert-ok' : 'alert-err'}>{status.message}</div>
//                 )}
//
//                 <div className="ag-label">Transaction Category</div>
//                 <div className="ag-toggles">
//                   <div className={`ag-toggle ${txCategory === 'SAVINGS_DEPOSIT' ? 'active' : ''}`} onClick={() => setTxCategory('SAVINGS_DEPOSIT')}>
//                     SAVINGS DEPOSIT
//                   </div>
//                   <div className={`ag-toggle ${txCategory === 'LOAN_REPAYMENT' ? 'active' : ''}`} onClick={() => setTxCategory('LOAN_REPAYMENT')}>
//                     LOAN EMI REPAYMENT
//                   </div>
//                 </div>
//
//                 <div className="ag-input-group">
//                   <label className="ag-label">Collection Amount (INR)</label>
//                   <input className="ag-input" type="number" placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
//                 </div>
//
//                 <div className="ag-label">Payment Modality</div>
//                 <div className="ag-toggles">
//                   {['CASH', 'UPI'].map(m => (
//                     <div key={m} className={`ag-toggle ${paymentMode === m ? 'active' : ''}`} onClick={() => setPaymentMode(m)}>{m}</div>
//                   ))}
//                 </div>
//
//                 <button className="ag-btn" onClick={handleDeposit}>Authorize & Submit</button>
//
//                 <div style={{ marginTop: 48 }}>
//                   <div className="ag-label" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 12 }}>Ledger History</div>
//                   {transactions.length === 0 ? <div style={{fontSize:13, color:'#A0ABC0'}}>No recent transactions.</div> :
//                    transactions.map((t, i) => (
//                     <div key={i} className="ag-tx-row">
//                       <div>
//                         <div className="ag-tx-amt">₹{parseFloat(t.amount).toLocaleString()}</div>
//                         <div className="ag-tx-date">{new Date(t.transactionDate).toLocaleString('en-IN')}</div>
//                       </div>
//                       <div style={{ textAlign: 'right' }}>
//                         <div className={`ag-tx-badge ${t.transactionCategory === 'LOAN_REPAYMENT' ? 'bg-loan' : 'bg-savings'}`}>
//                           {t.transactionCategory.replace('_', ' ')}
//                         </div>
//                         <div style={{ fontSize:11, color:'#A0ABC0', marginTop:6, fontWeight:600 }}>{t.paymentMode}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ) : (
//               <div style={{ height: '100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#A0ABC0', fontSize:15 }}>
//                 Select an account from the route ledger to initiate a transaction.
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
//
// // ═══════════════════════════════════════════════════════════════════════════════
// // 4. ROUTING & WRAPPERS
// // ═══════════════════════════════════════════════════════════════════════════════
// function ProtectedRoute({ user, allowedRoles, children }) {
//   if (!user) return <Navigate to="/login" replace />;
//   if (!allowedRoles.includes(user.role)) {
//     if (user.role === 'SYSTEM_ADMIN') return <Navigate to="/superadmin" replace />;
//     if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
//     return <Navigate to="/admin" replace />;
//   }
//   return children;
// }
//
// export default function App() {
//   const [user, setUser] = useState(() => {
//     try { const saved = sessionStorage.getItem('pigmypay_user'); return saved ? JSON.parse(saved) : null; }
//     catch { return null; }
//   });
//
//   const handleSetUser = useCallback((userData) => {
//     setUser(userData);
//     try { sessionStorage.setItem('pigmypay_user', JSON.stringify(userData)); } catch {}
//   }, []);
//
//   const handleLogout = useCallback(() => {
//     setUser(null);
//     try { sessionStorage.removeItem('pigmypay_user'); } catch {}
//     window.location.href = '/login';
//   }, []);
//
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<LandingPage />} />
//         <Route path="/login" element={ user ? <Navigate to={user.role === 'SYSTEM_ADMIN' ? '/superadmin' : user.role === 'AGENT' ? '/agent' : '/admin'} replace /> : <LoginPage setUser={handleSetUser} /> } />
//
//         <Route path="/superadmin" element={<ProtectedRoute user={user} allowedRoles={['SYSTEM_ADMIN']}><SuperAdminDashboard user={user} handleLogout={handleLogout} /></ProtectedRoute>} />
//         <Route path="/admin" element={<ProtectedRoute user={user} allowedRoles={['ADMIN','MANAGER']}><AdminDashboard user={user} handleLogout={handleLogout} /></ProtectedRoute>} />
//         <Route path="/agent" element={<ProtectedRoute user={user} allowedRoles={['AGENT','ADMIN','MANAGER']}><AgentDashboard user={user} handleLogout={handleLogout} /></ProtectedRoute>} />
//
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </Router>
//   );
// }



import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import AgentDashboard from './AgentDashboard';
import PublicReceiptPage from './pages/PublicReceiptPage';
import './index.css';

import { api } from './api';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const features = [
    { icon: '⚡', title: 'High-Velocity Collections', desc: 'Optimized ledger logging for field agents operating in high-density markets.' },
    { icon: '🏛️', title: 'Bank-Grade Vault Security', desc: 'Stateless JWT architecture with cryptographic multi-tenant blast walls.' },
    { icon: '📊', title: 'Real-Time Oversight', desc: 'Branch managers monitor portfolio liquidity and agent risk limits live.' },
    { icon: '📡', title: 'Satellite Synchronization', desc: 'Asynchronous offline batching ensures zero data loss in remote areas.' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap');
        .lp-body { font-family: 'Inter', sans-serif; background: #0A1128; color: #FFFFFF; min-height: 100vh; overflow-x: hidden; }
        .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 6vw; height: 80px; display: flex; align-items: center; justify-content: space-between; background: rgba(10, 17, 40, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(212, 175, 55, 0.15); }
        .lp-logo { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; }
        .lp-logo span { color: #D4AF37; font-style: italic; }
        .lp-hero { padding: 180px 6vw 120px; max-width: 1280px; margin: 0 auto; position: relative; }
        .lp-hero::after { content: ''; position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%); z-index: 0; pointer-events: none; }
        .lp-eyebrow { display: inline-flex; align-items: center; gap: 10px; color: #D4AF37; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 30px; border: 1px solid rgba(212, 175, 55, 0.3); padding: 6px 16px; border-radius: 4px; }
        .lp-h1 { font-family: 'Playfair Display', serif; font-size: clamp(48px, 6vw, 84px); line-height: 1.1; color: #FFFFFF; margin-bottom: 28px; position: relative; z-index: 1; }
        .lp-h1 em { color: #D4AF37; font-style: italic; }
        .lp-sub { font-size: clamp(16px, 2vw, 18px); color: #A0ABC0; line-height: 1.7; max-width: 600px; margin-bottom: 48px; font-weight: 300; }
        .lp-btn-main { background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%); color: #0A1128; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; padding: 16px 36px; border-radius: 4px; border: none; cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(212, 175, 55, 0.2); }
        .lp-btn-main:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(212, 175, 55, 0.3); }
        .lp-btn-sec { background: transparent; color: #FFFFFF; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 14px; padding: 15px 36px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.3); cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; }
        .lp-btn-sec:hover { border-color: #D4AF37; color: #D4AF37; background: rgba(212, 175, 55, 0.05); }
        .lp-features { background: #FFFFFF; color: #0A1128; padding: 120px 6vw; position: relative; }
        .lp-feat-head { font-family: 'Playfair Display', serif; font-size: clamp(36px, 4vw, 56px); margin-bottom: 60px; text-align: center; }
        .lp-feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; max-width: 1280px; margin: 0 auto; }
        .lp-feat-card { border-left: 2px solid #E2E8F0; padding-left: 24px; transition: border-color 0.3s; }
        .lp-feat-card:hover { border-color: #D4AF37; }
        .lp-feat-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; font-family: 'Playfair Display', serif; }
        .lp-feat-desc { font-size: 15px; color: #4A5568; line-height: 1.6; font-weight: 300; }
        @keyframes lp-fadein { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .lp-anim { opacity: 0; }
        .lp-anim.in { animation: lp-fadein 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <div className="lp-body">
        <nav className="lp-nav">
          <div className="lp-logo">Pigmy<span>Pay</span></div>
          <button className="lp-btn-sec" style={{ padding:'10px 24px', fontSize:12 }} onClick={() => navigate('/login')}>Secure Login</button>
        </nav>
        <section className="lp-hero">
          <div className={`lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.1s' }}>
            <div className="lp-eyebrow">Enterprise Core Banking</div>
          </div>
          <h1 className={`lp-h1 lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.2s' }}>
            Wealth management,<br /><em>decentralized.</em>
          </h1>
          <p className={`lp-sub lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.3s' }}>
            The premier satellite banking infrastructure for micro-finance. Equip your field agents with institutional-grade ledger tools and offline synchronization.
          </p>
          <div className={`lp-anim ${mounted ? 'in' : ''}`} style={{ animationDelay:'.4s', display:'flex', gap:'20px', flexWrap:'wrap' }}>
            <button className="lp-btn-main" onClick={() => navigate('/login')}>Access Corporate Portal</button>
            <button className="lp-btn-sec" onClick={() => alert('Contacting platform administration...')}>Request Audit</button>
          </div>
        </section>
        <section className="lp-features">
          <h2 className="lp-feat-head">Institutional Architecture</h2>
          <div className="lp-feat-grid">
            {features.map(f => (
              <div key={f.title} className="lp-feat-card">
                <div style={{ fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPage({ setUser }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) { setError('Credentials required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      setUser(res.data);
      const role = res.data.role;
      if (role === 'SYSTEM_ADMIN') navigate('/superadmin');
      else if (role === 'AGENT') navigate('/agent');
      else navigate('/admin');
    } catch (e) {
      setError(e.response?.data?.error || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-wrap { min-height: 100vh; display: flex; background: #0A1128; font-family: 'Inter', sans-serif; }
        .login-left { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
        .login-card { width: 100%; max-width: 380px; background: #FFFFFF; padding: 48px; border-radius: 8px; box-shadow: 0 24px 48px rgba(0,0,0,0.4); z-index: 1; }
        .login-logo { font-family: 'Playfair Display', serif; font-size: 28px; color: #0A1128; font-weight: 700; margin-bottom: 8px; text-align: center; }
        .login-logo span { color: #D4AF37; font-style: italic; }
        .login-sub { text-align: center; color: #718096; font-size: 13px; margin-bottom: 40px; letter-spacing: 0.5px; }
        .login-input { width: 100%; padding: 14px 16px; background: #F8F9FA; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 20px; }
        .login-input:focus { border-color: #D4AF37; background: #FFFFFF; }
        .login-btn { width: 100%; padding: 16px; background: #0A1128; color: #FFFFFF; font-weight: 600; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .login-btn:hover:not(:disabled) { background: #D4AF37; color: #0A1128; }
        .login-error { color: #E53E3E; font-size: 13px; text-align: center; margin-bottom: 16px; font-weight: 500; padding: 12px; background: #FFF5F5; border-radius: 4px; border: 1px solid #FEB2B2; }
      `}</style>
      <div className="login-wrap">
        <div className="login-left">
          <div className="login-card">
            <div className="login-logo">Pigmy<span>Pay</span></div>
            <div className="login-sub">SECURE PORTAL ACCESS</div>
            {error && <div className="login-error">{error}</div>}
            <input className="login-input" type="email" placeholder="Corporate Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button className="login-btn" onClick={handleLogin} disabled={loading}>{loading ? 'Verifying Identity...' : 'Authenticate'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PROTECTED ROUTE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'SYSTEM_ADMIN') return <Navigate to="/superadmin" replace />;
    if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
    return <Navigate to="/admin" replace />;
  }
  return children;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pigmypay_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleSetUser = useCallback((userData) => {
    setUser(userData);
    try { sessionStorage.setItem('pigmypay_user', JSON.stringify(userData)); } catch { /* storage unavailable */ }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    try { sessionStorage.removeItem('pigmypay_user'); } catch { /* storage unavailable */ }
    window.location.href = '/login';
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          user
            ? <Navigate to={user.role === 'SYSTEM_ADMIN' ? '/superadmin' : user.role === 'AGENT' ? '/agent' : '/admin'} replace />
            : <LoginPage setUser={handleSetUser} />
        } />
        <Route path="/superadmin" element={
          <ProtectedRoute user={user} allowedRoles={['SYSTEM_ADMIN']}>
            <SuperAdminDashboard user={user} handleLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute user={user} allowedRoles={['ADMIN', 'MANAGER']}>
            <AdminDashboard user={user} handleLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/agent" element={
          <ProtectedRoute user={user} allowedRoles={['AGENT', 'ADMIN', 'MANAGER']}>
            <AgentDashboard user={user} handleLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/receipt/:txnId" element={<PublicReceiptPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}