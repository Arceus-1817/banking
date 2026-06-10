import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function PublicReceiptPage() {
  const { txnId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Rating states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/public/transactions/receipt/${txnId}`);
        setData(res.data);
        if (res.data.transaction.rating) {
          setRating(res.data.transaction.rating);
        }
        if (res.data.transaction.feedback) {
          setFeedback(res.data.transaction.feedback);
        }
      } catch (err) {
        setError(err.response?.data || 'Failed to retrieve receipt information.');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [txnId]);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a star rating between 1 and 5');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/api/public/transactions/receipt/${txnId}/rate`, {
        rating,
        feedback
      });
      setSuccessMsg(res.data.message);
      // Update local state
      setData(prev => ({
        ...prev,
        transaction: {
          ...prev.transaction,
          rating,
          feedback
        }
      }));
    } catch (err) {
      alert(err.response?.data || 'Error submitting rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: 20, color: '#A0ABC0' }}>Loading secure receipt...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2 style={{ margin: '16px 0 8px', color: '#FF4757' }}>Receipt Error</h2>
          <p style={{ color: '#A0ABC0', fontSize: 14 }}>{error || 'Invalid or expired receipt ID.'}</p>
          <button style={styles.retryBtn} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const { transaction, customer, miniLedger } = data;
  const isAlreadyRated = transaction.rating !== null && transaction.rating > 0 && !successMsg;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap');
        .receipt-body {
          font-family: 'Inter', sans-serif;
          background: radial-gradient(circle at top, #0F1A3C 0%, #050A18 100%);
          color: #FFFFFF;
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .receipt-card {
          width: 100%;
          max-width: 580px;
          background: rgba(17, 28, 61, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .receipt-header {
          padding: 32px;
          background: linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%);
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
          text-align: center;
          position: relative;
        }
        .receipt-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 3px;
          background: #D4AF37;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }
        .logo {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .logo span {
          color: #D4AF37;
          font-style: italic;
        }
        .amount-display {
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          font-weight: 700;
          color: #D4AF37;
          margin: 16px 0 4px;
        }
        .status-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          background: rgba(46, 204, 113, 0.15);
          color: #2ECC71;
          border: 1px solid rgba(46, 204, 113, 0.25);
        }
        .status-pill.reversed {
          background: rgba(231, 76, 60, 0.15);
          color: #E74C3C;
          border: 1px solid rgba(231, 76, 60, 0.25);
        }
        .section-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: #718096;
          text-transform: uppercase;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 8px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 11px;
          color: #718096;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .meta-value {
          font-size: 14px;
          font-weight: 500;
          color: #E2E8F0;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .ledger-th {
          text-align: left;
          font-size: 11px;
          color: #718096;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          text-transform: uppercase;
        }
        .ledger-td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          color: #CBD5E0;
        }
        .star-rating {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 16px 0;
        }
        .star {
          font-size: 32px;
          cursor: pointer;
          transition: transform 0.2s, color 0.2s;
        }
        .star:hover {
          transform: scale(1.15);
        }
        .feedback-input {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 8px;
          color: #FFFFFF;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          resize: vertical;
          margin-bottom: 16px;
        }
        .feedback-input:focus {
          border-color: #D4AF37;
        }
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
          color: #0A1128;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .success-banner {
          background: rgba(46, 204, 113, 0.1);
          border: 1px solid rgba(46, 204, 113, 0.25);
          color: #2ECC71;
          padding: 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          margin-bottom: 16px;
        }
      `}</style>
      <div className="receipt-body">
        <div className="receipt-card">
          <div className="receipt-header">
            <div className="logo">Pigmy<span>Pay</span></div>
            <div style={{ color: '#718096', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Official Transaction Receipt</div>
            <div className="amount-display">₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className={`status-pill ${transaction.isReversed ? 'reversed' : ''}`}>
              {transaction.isReversed ? 'Reversed / Cancelled' : 'Successful Deposit'}
            </div>
          </div>

          <div style={{ padding: '32px' }}>
            {/* Meta Data */}
            <div className="section-title">Details</div>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Customer Name</span>
                <span className="meta-value">{customer.name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Account ID</span>
                <span className="meta-value" style={{ fontFamily: 'monospace' }}>{customer.accountNumber}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Collected By</span>
                <span className="meta-value">{transaction.agentName}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Timestamp</span>
                <span className="meta-value">{new Date(transaction.transactionDate).toLocaleString('en-IN')}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Payment Category</span>
                <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                  {transaction.transactionCategory.toLowerCase().replace('_', ' ')}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Modality</span>
                <span className="meta-value">{transaction.paymentMode}</span>
              </div>
            </div>

            {/* Mini Ledger */}
            <div className="section-title">Client Mini-Ledger</div>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Date</th>
                  <th className="ledger-th">Category</th>
                  <th className="ledger-th" style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {miniLedger.map((item) => (
                  <tr key={item.id}>
                    <td className="ledger-td">{new Date(item.transactionDate).toLocaleDateString('en-IN')}</td>
                    <td className="ledger-td" style={{ textTransform: 'capitalize' }}>
                      {item.transactionCategory.toLowerCase().replace('_', ' ')}
                      {item.isReversed && <span style={{ color: '#FF4757', marginLeft: 6, fontSize: 10 }}>[REV]</span>}
                    </td>
                    <td className="ledger-td" style={{ textAlign: 'right', fontWeight: 600, color: item.isReversed ? '#FF4757' : '#2ECC71' }}>
                      ₹{parseFloat(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rating & Feedback */}
            <div className="section-title">Rate Agent Service</div>
            {successMsg && <div className="success-banner">{successMsg}</div>}
            
            {isAlreadyRated ? (
              <div style={{ textAlign: 'center', padding: '10px 0', color: '#A0ABC0', fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <span 
                      key={starVal} 
                      style={{ 
                        fontSize: 24, 
                        color: starVal <= transaction.rating ? '#D4AF37' : '#2A3C6E' 
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p>You rated this service <strong>{transaction.rating} out of 5 stars</strong>.</p>
                {transaction.feedback && <p style={{ fontStyle: 'italic', marginTop: 8 }}>"{transaction.feedback}"</p>}
              </div>
            ) : !successMsg ? (
              <form onSubmit={handleSubmitRating}>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <span
                      key={starVal}
                      className="star"
                      style={{
                        color: starVal <= (hoverRating || rating) ? '#D4AF37' : '#2A3C6E'
                      }}
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <textarea
                  className="feedback-input"
                  rows={3}
                  placeholder="Share details about your service experience (optional)..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={rating === 0 || submitting}
                >
                  {submitting ? 'Submitting Feedback...' : 'Submit Rating'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#050A18',
    color: '#FFFFFF'
  },
  loader: {
    width: 40,
    height: 40,
    border: '4px solid #111C3D',
    borderTop: '4px solid #D4AF37',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#050A18',
    padding: 20
  },
  errorCard: {
    background: '#111C3D',
    border: '1px solid #1F326D',
    borderRadius: 12,
    padding: 40,
    maxWidth: 400,
    textAlign: 'center',
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
  },
  retryBtn: {
    marginTop: 20,
    padding: '10px 24px',
    background: 'transparent',
    color: '#D4AF37',
    border: '1px solid #D4AF37',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: '600'
  }
};
