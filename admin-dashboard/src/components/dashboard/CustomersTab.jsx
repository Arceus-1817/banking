import { useState } from 'react';
import { G } from '../../theme';

// Local formatter
const fmtR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function CustomersTab({ customers }) {
  // We keep the search state localized here so typing doesn't re-render the whole dashboard
  const [searchTerm, setSearchTerm] = useState('');

  // Filter customers based on search input
  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.accountNumber || '').includes(searchTerm)
  );

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>Customer Directory</h1>
          <p style={{ color: G.textSub, fontSize: 12, marginTop: 4 }}>Manage accounts, view balances, and check KYC status.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Search name or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 8, border: `1px solid ${G.border}`,
              background: G.surface, color: G.text, fontSize: 13, width: 260,
              outline: 'none'
            }}
          />
          <button className="btn-primary" onClick={() => alert("Add customer modal to be connected!")}>
            + Add Customer
          </button>
        </div>
      </div>

      <div className="fade-up-1" style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: G.rLg, overflow: 'hidden' }}>

        {/* ── Table Header ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: 16,
          padding: '14px 20px', background: G.surface, borderBottom: `1px solid ${G.border}`,
          fontSize: 11, fontWeight: 600, color: G.textSub, textTransform: 'uppercase', letterSpacing: '.05em'
        }}>
          <div>Customer Info</div>
          <div>Current Balance</div>
          <div>Assigned Agent</div>
          <div>KYC Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* ── Table Body ── */}
        {filteredCustomers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: G.muted, fontSize: 13 }}>
            {searchTerm ? "No customers match your search." : "No customers found."}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredCustomers.map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: 16,
                padding: '16px 20px', borderBottom: i === filteredCustomers.length - 1 ? 'none' : `1px solid ${G.border}`,
                alignItems: 'center', transition: 'background .2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${G.surface}88`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: G.text, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: G.textSub, marginTop: 4 }}>
                    ACC: {c.accountNumber} {c.phoneNumber ? ` • 📞 ${c.phoneNumber}` : ''}
                  </div>
                </div>

                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: G.accent, fontSize: 14 }}>
                  {fmtR(c.currentBalance)}
                </div>

                <div style={{ fontSize: 12, color: G.text }}>
                  {c.assignedAgent?.name ? (
                    <span>{c.assignedAgent.name}</span>
                  ) : (
                    <span style={{ color: G.warn, background: `${G.warn}15`, padding: '3px 8px', borderRadius: 4, fontSize: 10 }}>Unassigned</span>
                  )}
                </div>

                <div>
                  <span className={`tag ${c.kycStatus === 'VERIFIED' ? 'tag-green' : c.kycStatus === 'REJECTED' ? 'tag-red' : 'tag-amber'}`}>
                    {c.kycStatus || 'PENDING'}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }}>View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}