import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from './api';

export default function AgentDashboard({ user, handleLogout }) {
  const [customers, setCustomers]           = useState([]);
  const [selectedCustomer, setSelected]     = useState(null);
  const [depositAmount, setDepositAmount]   = useState('');
  const [paymentMode, setPaymentMode]       = useState('CASH');
  const [txType, setTxType]                 = useState('SAVINGS_DEPOSIT'); // Matched to new API
  const [activeLoan, setActiveLoan]         = useState(null);
  const [transactions, setTransactions]     = useState([]);
  const [status, setStatus]                 = useState({ type:'', message:'' });
  const [searchTerm, setSearch]             = useState('');
  const [loadingCustomers, setLoadingC]     = useState(true);
  const [isSaving, setIsSaving]             = useState(false);

  const getAuth = () => ({ headers: { Authorization: `Bearer ${user.token}` } });
  const agentId = user.id || user.userId;

  const fetchCustomers = useCallback(async () => {
    setLoadingC(true);
    try {
      const ts = Date.now();
      // Fetches only the customers assigned to their specific route for today!
      const res = await api.get(`/api/customers/agent/${agentId}?t=${ts}`, getAuth());
      const myCustomers = Array.isArray(res.data) ? res.data : [];
      myCustomers.sort((a, b) => (a.routeSequence || 999) - (b.routeSequence || 999));
      setCustomers(myCustomers);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) handleLogout();
    } finally { setLoadingC(false); }
  }, [agentId]);

  useEffect(() => { Promise.resolve().then(() => fetchCustomers()); }, [fetchCustomers]);

  const handleSelectCustomer = async (customer) => {
    setSelected(customer);
    setStatus({ type:'', message:'' });
    setTxType('SAVINGS_DEPOSIT');
    setDepositAmount('');
    setActiveLoan(null);

    try {
      const txRes = await api.get(`/api/transactions/history/${customer.id}`, getAuth());
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);

      const loanRes = await api.get(`/api/loans/customer/${customer.id}`, getAuth());
      const loans = Array.isArray(loanRes.data) ? loanRes.data : [];
      const active = loans.find(l => l.status === 'ACTIVE');
      if (active) {
        setActiveLoan(active);
        setTxType('LOAN_REPAYMENT');
        // Automatically default to the new Satellite API EMI format
        setDepositAmount(active.expectedMonthlyEmi || active.dailyEmiAmount || '');
      }
    } catch (e) {
      console.warn("Could not fetch history or loans", e);
      setTransactions([]);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setIsSaving(true);

    const body = {
      customerId: selectedCustomer.id,
      agentId: agentId,
      amount: parseFloat(depositAmount),
      paymentMode,
      transactionCategory: txType
    };

    try {
      if (txType === 'LOAN_REPAYMENT') {
        await api.post('/api/transactions/loan-emi', body, getAuth());
        setStatus({ type:'success', message:`Credit recovery of ₹${depositAmount} authorized.` });
      } else {
        await api.post('/api/transactions/deposit', body, getAuth());
        setStatus({ type:'success', message:`Liquidity deposit of ₹${depositAmount} committed.` });
      }

      setDepositAmount('');
      await fetchCustomers();
      handleSelectCustomer(selectedCustomer);
    } catch (e) {
      setStatus({ type:'error', message: e.response?.data?.message || e.response?.data || 'Transaction rejected. Verify connectivity.' });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.accountNumber?.includes(searchTerm)
  );

  const totalPortfolio = customers.reduce((s, c) => s + (c.currentBalance || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap');

        .ag-wrap { min-height: 100vh; background: #F3F4F6; color: #0A1128; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; }

        /* HEADER */
        .ag-header { background: #0A1128; color: #FFFFFF; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #D4AF37; flex-shrink: 0; }
        .ag-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .ag-logo span { color: #D4AF37; font-style: italic; }
        .ag-user { font-size: 13px; color: #E2E8F0; }
        .ag-user strong { color: #FFFFFF; font-weight: 600; }
        .ag-logout { background: transparent; border: 1px solid #4A5568; color: #FFFFFF; font-size: 12px; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: 0.5px; }
        .ag-logout:hover { background: #C53030; border-color: #C53030; }

        /* LAYOUT */
        .ag-main { display: flex; flex: 1; overflow: hidden; }
        @media (max-width: 768px) { .ag-main { flex-direction: column; overflow: auto; } }

        /* LEFT SIDEBAR (Route List) */
        .ag-left { width: 380px; background: #FFFFFF; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
        @media (max-width: 768px) { .ag-left { width: 100%; height: 40vh; border-right: none; border-bottom: 2px solid #E2E8F0; } }

        .ag-portfolio { padding: 24px; background: #F8F9FA; border-bottom: 1px solid #E2E8F0; }
        .ag-portfolio-label { font-size: 11px; color: #718096; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
        .ag-portfolio-value { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #0A1128; line-height: 1; }
        .ag-portfolio-sub { font-size: 12px; color: #718096; margin-top: 8px; font-weight: 500; }

        .ag-search-row { padding: 16px; border-bottom: 1px solid #E2E8F0; background: #FFFFFF; }
        .ag-search { width: 100%; background: #F3F4F6; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; padding: 12px 16px; font-size: 14px; outline: none; transition: border-color .2s; }
        .ag-search:focus { border-color: #D4AF37; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
        .ag-search::placeholder { color: #A0ABC0; }

        .ag-customer-list { flex: 1; overflow-y: auto; background: #FFFFFF; }
        .ag-customer-item { padding: 16px 24px; border-bottom: 1px solid #F3F4F6; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all .2s; border-left: 3px solid transparent; }
        .ag-customer-item:hover { background: #F8F9FA; }
        .ag-customer-item.active { background: #FDFBF5; border-left-color: #D4AF37; }
        .ag-customer-name { font-size: 15px; font-weight: 600; color: #0A1128; margin-bottom: 4px; }
        .ag-seq { color: #A0ABC0; font-size: 12px; font-weight: 700; margin-right: 8px; font-family: 'Inter', monospace; }
        .ag-customer-acc { font-size: 12px; color: #718096; font-family: monospace; }
        .ag-customer-bal { font-size: 15px; color: #2F855A; font-weight: 700; }

        /* RIGHT SIDEBAR (Ledger/Deposit Box) */
        .ag-right { flex: 1; overflow-y: auto; padding: 40px; background: #F3F4F6; }
        @media (max-width: 768px) { .ag-right { padding: 20px; } }

        .ag-card { background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 700px; margin: 0 auto; border-top: 4px solid #0A1128; }

        .ag-detail-name { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #0A1128; margin-bottom: 8px; }
        .ag-detail-phone { font-size: 14px; color: #718096; font-weight: 500; }
        .ag-loan-badge { background: #FEFCBF; border: 1px solid #F6E05E; color: #975A16; font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block; }

        .ag-status-ok { background: #F0FFF4; border-left: 4px solid #38A169; color: #22543D; padding: 16px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }
        .ag-status-err { background: #FFF5F5; border-left: 4px solid #E53E3E; color: #9B2C2C; padding: 16px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }

        .ag-deposit-box { margin-bottom: 32px; border-bottom: 1px solid #E2E8F0; padding-bottom: 32px; }
        .ag-deposit-title { font-size: 12px; color: #0A1128; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }

        .tx-toggle-container { display: flex; gap: 12px; margin-bottom: 20px; }
        .tx-toggle-btn { flex: 1; text-align: center; padding: 14px; font-size: 13px; font-weight: 600; border: 1px solid #E2E8F0; border-radius: 4px; cursor: pointer; transition: all .2s; color: #718096; background: #FFFFFF; }
        .tx-toggle-btn.active.savings { background: #0A1128; color: #FFFFFF; border-color: #0A1128; }
        .tx-toggle-btn.active.emi { background: #0A1128; color: #FFFFFF; border-color: #0A1128; }

        .ag-amount-input { width: 100%; background: #F8F9FA; border: 1px solid #E2E8F0; color: #0A1128; border-radius: 4px; padding: 20px; font-size: 32px; font-weight: 700; outline: none; box-sizing: border-box; margin-bottom: 20px; transition: border-color .2s; text-align: center; }
        .ag-amount-input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); background: #FFFFFF; }

        .ag-mode-row { display: flex; gap: 12px; margin-bottom: 24px; }
        .ag-mode-btn { flex: 1; padding: 14px; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; border: 1px solid #E2E8F0; background: #F8F9FA; color: #4A5568; }
        .ag-mode-btn.active { background: #EBF8FF; border-color: #3182CE; color: #2B6CB0; }

        .ag-confirm-btn { width: 100%; padding: 18px; background: #D4AF37; color: #0A1128; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all .2s; box-shadow: 0 4px 12px rgba(212,175,55,0.2); }
        .ag-confirm-btn:hover:not(:disabled) { background: #C5A880; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(212,175,55,0.3); }
        .ag-confirm-btn:disabled { cursor: not-allowed; opacity: 0.7; transform: none; box-shadow: none; }

        .ag-history-title { font-size: 12px; color: #718096; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
        .ag-txn-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #EDF2F7; align-items: center; }
        .ag-txn-amt { color: #0A1128; font-size: 16px; font-weight: 700; }
        .ag-txn-cat { font-size: 11px; color: #718096; margin-top: 4px; font-weight: 500; }
        .ag-txn-mode { font-size: 11px; font-weight: 600; color: #4A5568; background: #F3F4F6; padding: 4px 8px; border-radius: 4px; }
        .ag-txn-date { font-size: 12px; color: #A0ABC0; margin-top: 4px; text-align: right; }

        .ag-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #A0ABC0; font-size: 15px; font-weight: 500; gap: 16px; text-align: center; }
        .ag-empty-icon { font-size: 48px; opacity: 0.5; }
      `}</style>

      <div className="ag-wrap">
        <header className="ag-header">
          <div className="ag-logo">Pigmy<span>Pay</span> <span style={{ fontSize:12, color:'#A0ABC0', fontStyle:'normal', fontFamily:'Inter', fontWeight:500 }}>| Field Ledger</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div className="ag-user">Operative: <strong>{user.name}</strong></div>
            <button className="ag-logout" onClick={handleLogout}>Secure Exit</button>
          </div>
        </header>

        <div className="ag-main">
          {/* LEFT SIDEBAR: CUSTOMER LIST */}
          <div className="ag-left">
            <div className="ag-portfolio">
              <div className="ag-portfolio-label">Route Liquidity</div>
              <div className="ag-portfolio-value">₹{totalPortfolio.toLocaleString('en-IN')}</div>
              <div className="ag-portfolio-sub">{customers.length} accounts routed for collection today</div>
            </div>

            <div className="ag-search-row">
              <input className="ag-search" placeholder="Query route directory…" value={searchTerm} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="ag-customer-list">
              {loadingCustomers ? <div style={{ padding:30, color:'#718096', fontSize:13, textAlign:'center' }}>Downloading encrypted route...</div> :
                filtered.map(c => (
                <div key={c.id} className={`ag-customer-item ${selectedCustomer?.id === c.id ? 'active' : ''}`} onClick={() => handleSelectCustomer(c)}>
                  <div>
                    <div className="ag-customer-name">
                      <span className="ag-seq">{(c.routeSequence || 0).toString().padStart(2, '0')}</span>
                      {c.name}
                    </div>
                    <div className="ag-customer-acc">ID: {c.accountNumber}</div>
                  </div>
                  <div className="ag-customer-bal">₹{(c.currentBalance || 0).toLocaleString('en-IN')}</div>
                </div>
              ))}
              {filtered.length === 0 && !loadingCustomers && (
                 <div style={{ padding:40, color:'#A0ABC0', fontSize:14, textAlign:'center', fontStyle:'italic' }}>No routed accounts found.</div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: TRANSACTION ENGINE */}
          <div className="ag-right">
            {selectedCustomer ? (
              <div className="ag-card fade-up">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
                  <div>
                    <div className="ag-detail-name">{selectedCustomer.name}</div>
                    <div className="ag-detail-phone">{selectedCustomer.phoneNumber ? `Contact: ${selectedCustomer.phoneNumber}` : 'No contact registered'}</div>
                  </div>
                  {activeLoan && (
                    <div style={{ textAlign:'right' }}>
                      <div className="ag-loan-badge">ACTIVE CREDIT FACILITY</div>
                      <div style={{ fontSize:13, color:'#718096', marginTop:8, fontWeight:600 }}>Recovery Due: <span style={{color:'#D69E2E'}}>₹{activeLoan.totalAmountDue - activeLoan.amountPaid}</span></div>
                    </div>
                  )}
                </div>

                {status.message && status.type === 'success' && <div className="ag-status-ok">{status.message}</div>}
                {status.message && status.type === 'error' && <div className="ag-status-err">{status.message}</div>}

                <div className="ag-deposit-box">
                  <div className="ag-deposit-title">AUTHORIZE TRANSACTION</div>

                  <div className="tx-toggle-container">
                    <div className={`tx-toggle-btn ${txType === 'SAVINGS_DEPOSIT' ? 'active savings' : ''}`} onClick={() => { setTxType('SAVINGS_DEPOSIT'); setDepositAmount(''); }}>
                      SAVINGS DEPOSIT
                    </div>
                    <div className={`tx-toggle-btn ${txType === 'LOAN_REPAYMENT' ? 'active emi' : ''}`}
                          onClick={() => {
                            if (!activeLoan) return alert("Account has no active credit facility.");
                            setTxType('LOAN_REPAYMENT');
                            setDepositAmount(activeLoan.expectedMonthlyEmi || activeLoan.dailyEmiAmount || '');
                          }}>
                      CREDIT RECOVERY (EMI)
                    </div>
                  </div>

                  <input className="ag-amount-input" type="number" placeholder="₹ 0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} disabled={isSaving} />

                  <div className="ag-mode-row">
                    {['CASH', 'UPI'].map(m => (
                      <button key={m} className={`ag-mode-btn ${paymentMode === m ? 'active' : ''}`} onClick={() => setPaymentMode(m)}>
                        {m === 'CASH' ? '💵 PHYSICAL CASH' : '📱 DIGITAL UPI'}
                      </button>
                    ))}
                  </div>

                  <button className="ag-confirm-btn" onClick={handleDeposit} disabled={isSaving}>
                    {isSaving ? 'Processing Protocol...' : txType === 'LOAN_REPAYMENT' ? 'Authorize Recovery Payment' : 'Commit Liquidity Deposit'}
                  </button>
                </div>

                <div className="ag-history-title">Ledger History</div>
                {transactions.length === 0 ? <div style={{ color:'#A0ABC0', fontSize:13, fontStyle:'italic' }}>No prior ledger entries.</div> :
                  transactions.map((t, i) => (
                  <div key={i} className="ag-txn-row">
                    <div>
                      <div className="ag-txn-amt" style={{ color: t.transactionCategory === 'LOAN_REPAYMENT' ? '#D69E2E' : '#2F855A' }}>
                        + ₹{parseFloat(t.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="ag-txn-cat">{t.transactionCategory?.replace('_', ' ') || 'SAVINGS DEPOSIT'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span className="ag-txn-mode">{t.paymentMode || 'CASH'}</span>
                      <div className="ag-txn-date">{new Date(t.transactionDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ag-empty">
                <div className="ag-empty-icon">🗺️</div>
                <div>Select an account from your daily route<br/>to authorize ledger transactions.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}