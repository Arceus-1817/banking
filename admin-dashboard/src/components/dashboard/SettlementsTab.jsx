import axios from 'axios';
import { G } from '../../theme';

// ─── Local Helper (Will consolidate later) ───────────────────────────────────
const fmtR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SettlementsTab({ pendingCash, authH, fetchAll }) {
  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>End of Day Settlement</h1>
          <p style={{ color: G.textSub, fontSize: 12, marginTop: 4 }}>Verify physical cash handed over by field agents.</p>
        </div>
      </div>

      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
        {Object.keys(pendingCash).length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', background: G.card, border: `1px dashed ${G.borderHi}`, borderRadius: G.rLg, color: G.muted, fontSize: 13 }}>
            All agents are fully settled! No pending cash in transit.
          </div>
        ) : (
          Object.entries(pendingCash).map(([agentKey, data]) => {
            const [agentName, agentId] = agentKey.split('|');
            return (
              <div key={agentId} style={{ background: G.card, border: `1px solid ${G.warn}44`, borderRadius: G.rLg, padding: 22, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${G.warn},${G.warn}44)` }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: G.text }}>{agentName}</div>
                    <div style={{ fontSize: 11, color: G.textSub }}>Agent ID: {agentId}</div>
                  </div>
                  <span className="tag tag-amber">UNSETTLED</span>
                </div>

                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: G.textSub }}>Physical Cash Due</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: G.warn, fontFamily: 'var(--font-display)' }}>{fmtR(data.totalCash)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: G.textSub }}>Transactions</span>
                    <span style={{ fontSize: 12, color: G.text }}>{data.transactionCount} receipts</span>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', background: G.accent, color: '#000' }}
                  onClick={async () => {
                    if (window.confirm(`Did you physically receive exactly ${fmtR(data.totalCash)} from ${agentName}?`)) {
                      try {
                        await axios.post(`http://localhost:8085/api/settlements/confirm/${agentId}`, {}, authH);
                        fetchAll(); // Refresh the board immediately
                      } catch (_e) {
                        alert("Failed to settle cash. Check your connection.");
                      }
                    }
                  }}
                >
                  Verify & Settle Cash
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}