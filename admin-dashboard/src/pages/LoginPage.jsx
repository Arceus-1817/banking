import { useState } from 'react';
import axios from 'axios';
import { G } from '../theme';

export default function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8085/api/auth/login', {
        email,
        password
      });

      // Store token and user details passed back from backend
      setUser({
        ...res.data.user,
        token: res.data.token
      });
    } catch (err) {
      setError(err.response?.data || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: G.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: G.card, padding: 40, borderRadius: G.rLg, width: '100%', maxWidth: 400, border: `1px solid ${G.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: G.accentBg, border: `1px solid ${G.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>
            ₿
          </div>
          <h1 style={{ color: G.text, fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 800 }}>PigmyPay</h1>
          <p style={{ color: G.textSub, fontSize: 13, marginTop: 8 }}>Secure System Access</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ background: `${G.danger}15`, color: G.danger, padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20, textAlign: 'center', border: `1px solid ${G.danger}33` }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: G.textSub, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 14, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: G.textSub, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 14, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 14, background: G.accent, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}