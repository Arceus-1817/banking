import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SuperAdminDashboard({ user, handleLogout }) {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Client Form State
  const [companyName, setCompanyName] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const validToken = user.token || user.jwt || user.accessToken;
  const authH = { headers: { Authorization: "Bearer " + validToken } };

  const fetchClients = async () => {
    try {
      const res = await axios.get('http://localhost:8085/api/superadmin/clients', authH);
      setClients(res.data);
    } catch (e) {
      console.error("Failed to fetch clients", e);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:8085/api/superadmin/onboard', {
        companyName, plan, adminName, adminEmail, adminPassword, adminPhoneNumber
      }, authH);

      alert("Institutional Client Successfully Provisioned.");
      setShowModal(false);
      setCompanyName(''); setAdminName(''); setAdminEmail(''); setAdminPassword(''); setAdminPhoneNumber('');
      fetchClients();
    } catch (e) {
      alert(e.response?.data || "Failed to onboard client.");
    }
    setLoading(false);
  };

  // 1. FILTER: Remove the System Admin's own HQ Tenant from the client list
  const activeClients = clients.filter(c =>
    c.id !== user.tenantId &&
    c.companyName !== "PigmyPay System HQ"
  );

  // 2. CALCULATE REVENUE: Calculate actual MRR based on active client plans
  const calculateMRR = () => {
    return activeClients.reduce((total, client) => {
      if (client.plan === 'STARTER') return total + 999;
      if (client.plan === 'GROWTH') return total + 2499;
      if (client.plan === 'ENTERPRISE') return total + 4999; // Base Enterprise price
      return total;
    }, 0);
  };

  const currentMRR = calculateMRR();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap');

        .sa-wrap { min-height: 100vh; background: #F3F4F6; color: #0A1128; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; }

        /* HEADER */
        .sa-header { background: #0A1128; color: #FFFFFF; padding: 0 40px; height: 72px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #D4AF37; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .sa-logo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .sa-logo span { color: #D4AF37; font-style: italic; }
        .sa-subtitle { font-size: 11px; color: #A0ABC0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-top: 2px; }

        .sa-user { font-size: 13px; color: #E2E8F0; font-weight: 500; }
        .sa-logout { background: transparent; border: 1px solid #4A5568; color: #FFFFFF; font-size: 12px; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .sa-logout:hover { background: #C53030; border-color: #C53030; }

        /* MAIN CONTENT */
        .sa-main { padding: 48px 40px; max-width: 1280px; margin: 0 auto; width: 100%; flex: 1; }

        .sa-page-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #0A1128; margin-bottom: 8px; }
        .sa-page-desc { color: #4A5568; font-size: 14px; font-weight: 500; }

        .btn-primary { background: #D4AF37; color: #0A1128; font-weight: 700; font-size: 13px; padding: 14px 28px; border-radius: 4px; border: none; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.2); transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { background: #C5A880; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(212,175,55,0.3); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

        .btn-ghost { background: transparent; color: #4A5568; font-weight: 600; font-size: 13px; padding: 14px 28px; border-radius: 4px; border: 1px solid #CBD5E0; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; }
        .btn-ghost:hover { border-color: #0A1128; color: #0A1128; background: #F8F9FA; }

        /* STATS CARDS */
        .sa-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px; }
        .sa-stat-card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 32px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s; position: relative; overflow: hidden; }
        .sa-stat-card:hover { border-color: #D4AF37; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,175,55,0.1); }
        .sa-stat-card::after { content: ''; position: absolute; top: 0; right: 0; width: 80px; height: 80px; background: radial-gradient(circle at top right, rgba(212,175,55,0.1), transparent 70%); pointer-events: none; }
        .sa-stat-label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px; }
        .sa-stat-value { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; color: #0A1128; line-height: 1; }

        /* TABLE */
        .sa-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .sa-table-header { padding: 16px 24px; background: #F8F9FA; border-bottom: 1px solid #E2E8F0; font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 1px; }
        .sa-table-row { display: grid; grid-template-columns: 1fr 2fr 1.5fr 1fr; gap: 16px; padding: 20px 24px; border-bottom: 1px solid #F3F4F6; align-items: center; transition: background 0.2s; }
        .sa-table-row:hover { background: #FDFBF5; }
        .sa-table-row:last-child { border-bottom: none; }

        .sa-cell-id { font-family: monospace; color: #718096; font-size: 13px; }
        .sa-cell-name { font-size: 15px; font-weight: 600; color: #0A1128; }
        .sa-cell-date { font-size: 12px; color: #A0ABC0; margin-top: 4px; font-weight: 500; }
        .sa-badge-plan { background: #EBF8FF; color: #2B6CB0; border: 1px solid #90CDF4; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; display: inline-block; }
        .sa-badge-status { display: inline-flex; align-items: center; gap: 6px; color: #2F855A; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
        .sa-dot { width: 8px; height: 8px; border-radius: 50%; background: #38A169; }

        /* MODAL */
        .sa-modal-overlay { position: fixed; inset: 0; background: rgba(10, 17, 40, 0.7); backdrop-filter: blur(8px); display: flex; alignItems: center; justify-content: center; z-index: 1000; }
        .sa-modal-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; width: 100%; max-width: 520px; box-shadow: 0 24px 48px rgba(0,0,0,0.2); overflow: hidden; animation: fadeUp 0.3s ease; }
        .sa-modal-header { padding: 24px 32px; border-bottom: 1px solid #E2E8F0; background: #F8F9FA; }
        .sa-modal-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #0A1128; margin-bottom: 6px; }
        .sa-modal-desc { font-size: 13px; color: #718096; font-weight: 500; }
        .sa-modal-body { padding: 32px; }

        .sa-form-group { margin-bottom: 24px; }
        .sa-form-label { display: block; font-size: 11px; color: #4A5568; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
        .sa-input { width: 100%; padding: 14px 16px; margin-bottom: 12px; background: #F8F9FA; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; font-size: 14px; outline: none; transition: all 0.2s; }
        .sa-input:focus { border-color: #D4AF37; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
        .sa-input::placeholder { color: #A0ABC0; }
        .sa-select { width: 100%; padding: 14px 16px; background: #F8F9FA; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; font-size: 14px; outline: none; cursor: pointer; transition: all 0.2s; margin-bottom: 12px; }
        .sa-select:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .fade-up { animation: fadeUp .5s ease both }
        .fade-up-1 { animation: fadeUp .5s .1s ease both }
        .fade-up-2 { animation: fadeUp .5s .2s ease both }
      `}</style>

      <div className="sa-wrap">

        {/* ── HEADER ── */}
        <header className="sa-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#D4AF37', fontFamily: 'Playfair Display', fontWeight: 'bold' }}>P</div>
            <div>
              <div className="sa-logo">Pigmy<span>Pay</span></div>
              <div className="sa-subtitle">Super Admin Console</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div className="sa-user">Welcome, {user.name}</div>
            <button className="sa-logout" onClick={handleLogout}>Terminate Session</button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="sa-main">

          <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <h1 className="sa-page-title">Network Oversight</h1>
              <p className="sa-page-desc">Provision corporate workspaces and monitor global SaaS subscriptions.</p>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Provision Enterprise Client</button>
          </div>

          {/* STATS ROW */}
          <div className="sa-stats-grid fade-up-1">
            <div className="sa-stat-card">
              <div className="sa-stat-label">Active Institutions</div>
              <div className="sa-stat-value">{activeClients.length}</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-label">Monthly Recurring Revenue</div>
              <div className="sa-stat-value">₹{currentMRR.toLocaleString('en-IN')} <span style={{ fontSize: 16, color: '#A0ABC0', fontWeight: 500, fontFamily: 'Inter' }}>/mo</span></div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-label">System Integrity</div>
              <div className="sa-stat-value" style={{ color: '#2F855A' }}>100% <span style={{ fontSize: 16, color: '#A0ABC0', fontWeight: 500, fontFamily: 'Inter' }}>Operational</span></div>
            </div>
          </div>

          {/* CLIENT LIST */}
          <div className="sa-table-container fade-up-2">
            <div className="sa-table-header">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1fr', gap: 16 }}>
                <div>Tenant Code</div>
                <div>Institution Name</div>
                <div>Service Tier</div>
                <div>Network Status</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activeClients.length === 0 ? (
                 <div style={{ padding: 60, textAlign: 'center', color: '#A0ABC0', fontSize: 14, fontStyle: 'italic' }}>No institutional clients provisioned on the network.</div>
              ) : (
                activeClients.map((c) => (
                  <div key={c.id} className="sa-table-row">
                    <div className="sa-cell-id">#{String(c.id).padStart(4, '0')}</div>
                    <div>
                      <div className="sa-cell-name">{c.companyName}</div>
                      <div className="sa-cell-date">Provisioned: {new Date(c.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div><span className="sa-badge-plan">{c.plan || 'STARTER'}</span></div>
                    <div><span className="sa-badge-status"><div className="sa-dot"/> SECURE & ACTIVE</span></div>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>

        {/* ── ONBOARDING MODAL ── */}
        {showModal && (
          <div className="sa-modal-overlay">
            <div className="sa-modal-card">
              <div className="sa-modal-header">
                <h3 className="sa-modal-title">Provision Client Workspace</h3>
                <p className="sa-modal-desc">Generates an isolated database tenant and primary administrator access.</p>
              </div>

              <div className="sa-modal-body">
                <form onSubmit={handleOnboard}>

                  <div className="sa-form-group">
                    <label className="sa-form-label">Institution Details</label>
                    <input className="sa-input" required placeholder="Registered Corporate Entity Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <select className="sa-select" value={plan} onChange={e => setPlan(e.target.value)}>
                      <option value="STARTER">Starter Tier (₹999/mo)</option>
                      <option value="GROWTH">Growth Tier (₹2,499/mo)</option>
                      <option value="ENTERPRISE">Enterprise Tier (Custom Protocol)</option>
                    </select>
                  </div>

                  <div className="sa-form-group">
                    <label className="sa-form-label">Primary Administrator Credential</label>
                    <input className="sa-input" required placeholder="Full Name of Administrator" value={adminName} onChange={e => setAdminName(e.target.value)} />
                    <input className="sa-input" required type="email" placeholder="Corporate Email Address" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                    <input className="sa-input" required type="tel" placeholder="Secure Contact Number" value={adminPhoneNumber} onChange={e => setAdminPhoneNumber(e.target.value)} />
                    <input className="sa-input" required type="password" placeholder="Initial Authorization Password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
                    <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel Protocol</button>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                      {loading ? 'Provisioning...' : 'Authorize & Provision'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}