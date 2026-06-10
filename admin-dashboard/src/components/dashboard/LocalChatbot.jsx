import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Design tokens matching AdminDashboard.jsx G constant
const G = {
  sidebarBg: '#0A1128',
  accent: '#D4AF37',
  accentDim: '#AA8222',
  accentBg: 'rgba(212, 175, 55, 0.08)',
  accentGlow: 'rgba(212, 175, 55, 0.2)',
  text: '#0A1128',
  textSub: '#4A5568',
  muted: '#718096',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  info: '#3b82f6',
  warn: '#ffa502',
  danger: '#ff4757',
  purple: '#8b5cf6',
  success: '#10b981',
};

export default function LocalChatbot({
  activeTab,
  setActiveTab,
  users,
  customers,
  branches,
  stats,
  setEditAgent,
  setSelectedCustomer,
  token,
  fetchAll,
  setSearch,
  setCustSearch,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Greetings. I am your local Operations Assistant. How may I facilitate your dashboard workflows today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const handleSend = (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) setInputValue('');

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTyping(true);

    // Simulate localized thinking time for micro-animation feel
    setTimeout(async () => {
      await processCommand(text);
      setTyping(false);
    }, 450);
  };

  // Local rule-based command parsing & NLP
  const processCommand = async (rawText) => {
    const query = rawText.toLowerCase().trim();
    let replyText = "I did not quite comprehend that command. Try typing 'help' to see my capabilities, or use the quick reply chips.";
    let cardData = null;

    // Auth Header for AJAX calls
    const authH = { headers: { Authorization: "Bearer " + token } };

    // 1. HELP & GREETINGS
    if (query === 'help' || query === 'hi' || query === 'hello' || query === 'hey' || query === 'assist') {
      replyText = "I can assist you with local search, filters, EMI calculations, audits, theme overrides, and diagnostics: \n\n" +
        "• 'find customer [name]'\n" +
        "• 'audit [customer_name]'\n" +
        "• 'filter customer [name]' / 'filter agent [name]'\n" +
        "• 'emi [amount] [rate%] [tenure]'\n" +
        "• 'dark mode' / 'light mode' / 'toggle compact'\n" +
        "• 'csv format' / 'diagnostics'";
    }
    // 2. TWILIO BYPASS HELP
    else if (query.includes('bypass') || query.includes('otp') || query.includes('twilio') || query.includes('verification')) {
      replyText = "To bypass Twilio OTP and bind a device manually:\n\n" +
        "1. Have the field agent attempt a login in their mobile app with their email and password.\n" +
        "2. The server will catch their Device ID and generate a pending request.\n" +
        "3. Open the agent configuration modal here in the Admin Dashboard.\n" +
        "4. In the 'Device Security Binding' section, you will see their OTP and an 'Approve & Bind Device' button. Click it to authorize instantly.";
    }
    // 3. SYSTEM DIAGNOSTICS
    else if (query === 'diagnostics' || query === 'status' || query === 'test' || query === 'health') {
      replyText = "Executing local system diagnostic metrics...";
      const activeAgents = users.filter((u) => u.role === 'AGENT' && u.isActive).length;
      const inactiveAgents = users.filter((u) => u.role === 'AGENT' && !u.isActive).length;
      cardData = {
        type: 'diagnostics',
        serverUrl: import.meta.env.VITE_API_URL || 'http://localhost:8085',
        latency: 'Checking...',
        agentsCount: users.filter((u) => u.role === 'AGENT').length,
        activeAgents,
        inactiveAgents,
        customerCount: customers.length,
        branchesCount: branches.length,
        todayCollection: stats?.todayCollection || 0,
      };
    }
    // 4. EMI CALCULATOR
    else if (/emi|calculate|calc|loan/i.test(query) && /\d+/.test(query) && !query.includes('audit') && !query.includes('loan for')) {
      const numbers = query.match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const principal = parseFloat(numbers[0]);
        const interestRate = parseFloat(numbers[1]);
        const tenureMonths = numbers[2] ? parseInt(numbers[2], 10) : 12;

        const totalInterest = principal * (interestRate / 100);
        const totalAmountDue = principal + totalInterest;
        const monthlyEmi = Math.ceil(totalAmountDue / tenureMonths);

        replyText = `Here is the simulated credit facility breakdown for ₹${principal.toLocaleString()} at ${interestRate}% Flat Interest:`;
        cardData = {
          type: 'emi',
          principal,
          interestRate,
          tenureMonths,
          totalInterest,
          totalAmountDue,
          monthlyEmi,
        };
      } else {
        replyText = "To calculate EMI, please specify: 'emi [amount] [interest%] [tenure_months]'. E.g. 'emi 50000 12 12'";
      }
    }
    // 5. SWITCH TABS
    else if (query.startsWith('go to ') || query.startsWith('show ') || query.startsWith('switch to ')) {
      const target = query.replace(/(go to |show |switch to | tab)/g, '').trim();
      const tabMapping = {
        overview: 'overview',
        branches: 'branches',
        agents: 'agents',
        customers: 'customers',
        logistics: 'logistics',
        settlements: 'settlements',
        analytics: 'analytics',
        sync: 'sync',
      };

      const tabKey = Object.keys(tabMapping).find((k) => k.includes(target) || target.includes(k));
      if (tabKey) {
        const tabName = tabMapping[tabKey];
        setActiveTab(tabName);
        replyText = `Dashboard view successfully redirected to the **${tabName.toUpperCase()}** tab.`;
      } else {
        replyText = `I could not locate a tab matching '${target}'. Available tabs: Overview, Branches, Customers, Logistics, Settlements, Analytics, Sync.`;
      }
    }
    // 6. SEARCH AGENT / EMPLOYEE
    else if (query.startsWith('find agent ') || query.startsWith('show agent ') || (query.startsWith('agent ') && !query.includes('unlock') && !query.includes('lock'))) {
      const namePattern = query.replace(/(find agent |show agent |agent |details of )/g, '').trim();
      const match = users.find((u) => u.name.toLowerCase().includes(namePattern));
      if (match) {
        replyText = `I found a matching agent profile for '${match.name}':`;
        cardData = {
          type: 'agent',
          data: match,
        };
      } else {
        replyText = `No agent profiles match the query '${namePattern}'.`;
      }
    }
    // 7. SEARCH CUSTOMER
    else if (query.startsWith('find customer ') || query.startsWith('show customer ') || query.startsWith('customer ')) {
      const namePattern = query.replace(/(find customer |show customer |customer |details of )/g, '').trim();
      const match = customers.find((c) => c.name.toLowerCase().includes(namePattern));
      if (match) {
        replyText = `I found a matching customer dossier for '${match.name}':`;
        cardData = {
          type: 'customer',
          data: match,
        };
      } else {
        replyText = `No customer records match the query '${namePattern}'.`;
      }
    }
    // 8. LOAN CHECK FOR CUSTOMER
    else if (query.includes('loan for ') || query.includes('active loan ') || query.includes('emi for ')) {
      const namePattern = query.replace(/(loan for |active loan |emi for )/g, '').trim();
      const match = customers.find((c) => c.name.toLowerCase().includes(namePattern));
      if (match) {
        if (match.activeLoan) {
          replyText = `Here is the active loan status for '${match.name}':`;
          cardData = {
            type: 'loan',
            customerName: match.name,
            loan: match.activeLoan,
          };
        } else {
          replyText = `Customer '${match.name}' holds no active credit facilities on the ledger.`;
        }
      } else {
        replyText = `No customer records match the name '${namePattern}' to check loan status.`;
      }
    }
    // 9. DYNAMIC UI FILTERING
    else if (query.startsWith('filter agent ') || query.startsWith('search agent ')) {
      const term = query.replace(/(filter agent |search agent )/g, '').trim();
      setSearch(term);
      setActiveTab('agents');
      replyText = `Filtered active identities directory for: **"${term}"**.`;
    }
    else if (query.startsWith('filter customer ') || query.startsWith('search customer ')) {
      const term = query.replace(/(filter customer |search customer )/g, '').trim();
      setCustSearch(term);
      setActiveTab('customers');
      replyText = `Filtered customer records database for: **"${term}"**.`;
    }
    else if (query === 'clear filter' || query === 'reset filter' || query === 'clear filters') {
      setSearch('');
      setCustSearch('');
      replyText = "All active directory filters and search buffers have been cleared.";
    }
    // 10. TRANSACTION AUDITING
    else if (query.startsWith('audit ') || query.startsWith('transactions of ') || query.startsWith('ledger of ')) {
      const term = query.replace(/(audit |transactions of |ledger of )/g, '').trim();
      const match = customers.find((c) => c.name.toLowerCase().includes(term));
      if (match) {
        try {
          replyText = `Fetching authenticated transaction ledger history for **${match.name}**...`;
          const res = await axios.get(`http://localhost:8085/api/transactions/history/${match.id}`, authH);
          const txs = Array.isArray(res.data) ? res.data : [];
          if (txs.length === 0) {
            replyText = `Found customer '${match.name}', but they have no transaction ledger history.`;
          } else {
            replyText = `Ledger transaction records for customer **${match.name}** (A/C: ${match.accountNumber}):`;
            cardData = {
              type: 'audit',
              customerName: match.name,
              transactions: txs.slice(0, 5), // last 5 transactions
            };
          }
        } catch (e) {
          replyText = `Audit request failed: ${e.response?.data?.message || 'Access Denied or Connection Timeout.'}`;
        }
      } else {
        replyText = `Could not locate customer records matching query '${term}' to audit.`;
      }
    }
    // 11. THEME & COMPACT VIEW TOGGLE
    else if (query === 'dark mode' || query === 'theme dark' || query === 'enable dark mode') {
      const root = document.documentElement;
      root.style.setProperty('--bg', '#070D1F');
      root.style.setProperty('--surface', '#0E1730');
      root.style.setProperty('--card', '#0E1730');
      root.style.setProperty('--border', '#1E2D5A');
      root.style.setProperty('--text', '#FFFFFF');
      root.style.setProperty('--text-sub', '#A0ABC0');
      root.style.setProperty('--border-hi', '#1E2D5A');
      setIsDarkMode(true);
      replyText = "Institutional dark mode theme injected successfully.";
    }
    else if (query === 'light mode' || query === 'theme light' || query === 'enable light mode') {
      const root = document.documentElement;
      root.style.setProperty('--bg', '#F3F4F6');
      root.style.setProperty('--surface', '#FFFFFF');
      root.style.setProperty('--card', '#FFFFFF');
      root.style.setProperty('--border', '#E2E8F0');
      root.style.setProperty('--text', '#0A1128');
      root.style.setProperty('--text-sub', '#4A5568');
      root.style.setProperty('--border-hi', '#CBD5E0');
      setIsDarkMode(false);
      replyText = "Default light theme stylesheet restored.";
    }
    else if (query === 'compact view' || query === 'toggle compact' || query === 'compact mode') {
      setIsCompact(!isCompact);
      replyText = !isCompact ? "High-density compact view layout stylesheet enabled." : "Standard padding layouts restored.";
    }
    // 12. ADMIN CHEAT SHEETS
    else if (query === 'csv format' || query === 'import template' || query === 'csv template') {
      replyText = "Here is the exact CSV header structure expected by the Bank Integration importer:\n\n" +
        "```csv\n" +
        "accountNumber,name,balance,assignedAgentEmail,aadharNumber,panNumber,address,guarantorName,guarantorPhone\n" +
        "```\n" +
        "Make sure to save it with UTF-8 encoding before uploading in the Sync tab.";
    }
    else if (query.includes('unlock') || query.includes('locked')) {
      replyText = "If an agent is locked out (due to 5 failed login attempts):\n\n" +
        "1. Open the agent configuration modal under the Agents tab.\n" +
        "2. Click the **'Clear Bind'** button inside the Device Security Binding card.\n" +
        "3. This automatically resets their lockout counters and clears their locked timestamp.\n" +
        "4. Alternatively, use the **'Force Reset'** button under Reset Credentials to change their password.";
    }
    // 13. THANK YOU
    else if (query.includes('thank')) {
      replyText = "You are welcome. Operational assistance is at your disposal.";
    }

    // Add bot response
    const botMsg = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: replyText,
      timestamp: new Date(),
      card: cardData,
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => {
    return '₹' + parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <>
      {/* Dynamic Style Override for Compact Mode */}
      {isCompact && (
        <style>{`
          /* High-density grid overrides */
          table, th, td { padding: 8px 12px !important; font-size: 13px !important; }
          .ag-table td, .ag-table th { padding: 8px 12px !important; }
          input, select, button { padding: 8px 12px !important; font-size: 13px !important; }
          .btn-primary, .btn-ghost, .btn-warn, .btn-danger { padding: 8px 16px !important; }
          h2, h3 { margin-bottom: 8px !important; }
        `}</style>
      )}

      {/* Floating Chat Bubble Button */}
      <button
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: G.sidebarBg,
          border: `1px solid ${G.accent}`,
          boxShadow: `0 8px 24px ${G.accentGlow}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={() => setIsOpen(!isOpen)}
        className="chatbot-trigger"
      >
        {isOpen ? (
          <span style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'light' }}>✕</span>
        ) : (
          <span style={{ color: G.accent, fontSize: 24 }}>💬</span>
        )}
      </button>

      {/* Expandable Chat Pane */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 380,
            height: 520,
            background: isDarkMode ? '#0E1730' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
            borderRadius: 12,
            boxShadow: '0 12px 36px rgba(10, 17, 40, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: G.sidebarBg,
              color: '#FFFFFF',
              padding: '16px 20px',
              borderBottom: `2px solid ${G.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', color: G.accent }}>OPERATIONS ASSISTANT</div>
              <div style={{ fontSize: 10, color: G.muted }}>Offline command panel</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: G.success }} />
          </div>

          {/* Messages Scroll Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: isDarkMode ? '#070D1F' : '#FAFAFB',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Bubble Text */}
                <div
                  style={{
                    background: m.sender === 'user' ? G.sidebarBg : (isDarkMode ? '#0E1730' : '#FFFFFF'),
                    color: m.sender === 'user' ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : G.text),
                    border: m.sender === 'user' ? 'none' : `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    boxShadow: m.sender === 'user' ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  {m.text}
                </div>

                {/* Optional Rich Cards */}
                {m.card && renderCard(m.card)}

                {/* Timestamp */}
                <span style={{ fontSize: 9, color: G.muted, marginTop: 4, padding: '0 4px' }}>
                  {formatTime(m.timestamp)}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {typing && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '10px 14px', background: isDarkMode ? '#0E1730' : '#FFFFFF', border: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`, borderRadius: '12px 12px 12px 0' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: G.muted, animation: 'bounce 1s infinite' }} />
                <div style={{ width: 6, height: 6, borderRadius: 3, background: G.muted, animation: 'bounce 1s infinite 0.2s' }} />
                <div style={{ width: 6, height: 6, borderRadius: 3, background: G.muted, animation: 'bounce 1s infinite 0.4s' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Reply Option Chips */}
          <div
            style={{
              padding: '10px 16px',
              background: isDarkMode ? '#0E1730' : '#FFFFFF',
              borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            <button className="chip-btn" onClick={() => handleSend('Bypass Twilio OTP')}>🔐 Bypass OTP</button>
            <button className="chip-btn" onClick={() => handleSend(isDarkMode ? 'light mode' : 'dark mode')}>🎨 {isDarkMode ? 'Light Mode' : 'Dark Mode'}</button>
            <button className="chip-btn" onClick={() => handleSend('toggle compact')}>📊 Compact View</button>
            <button className="chip-btn" onClick={() => handleSend('csv format')}>📄 CSV Importer Format</button>
            <button className="chip-btn" onClick={() => handleSend('diagnostics')}>⚙️ Diagnostics</button>
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: '12px 16px',
              background: isDarkMode ? '#0E1730' : '#FFFFFF',
              borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or type a shortcut..."
              style={{
                flex: 1,
                border: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 13,
                outline: 'none',
                background: isDarkMode ? '#070D1F' : '#F8F9FA',
                color: isDarkMode ? '#FFFFFF' : G.text,
              }}
            />
            <button
              onClick={() => handleSend()}
              style={{
                background: G.sidebarBg,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              SEND
            </button>
          </div>
        </div>
      )}

      {/* Embed local style overrides inside component return */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .chip-btn {
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          color: ${isDarkMode ? '#A0ABC0' : G.textSub};
          background: ${isDarkMode ? '#1E2D5A' : '#F1F5F9'};
          border: 1px solid ${isDarkMode ? '#1E2D5A' : G.border};
          border-radius: 14px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip-btn:hover {
          background: ${G.accentBg};
          border-color: ${G.accent};
          color: ${G.accentDim};
        }
      `}</style>
    </>
  );

  // Render helper for rich card objects
  function renderCard(card) {
    const cardBgStyle = {
      marginTop: 8,
      width: '100%',
      background: isDarkMode ? '#131F3F' : '#FFFFFF',
      border: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`,
      borderRadius: 8,
      padding: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      color: isDarkMode ? '#FFFFFF' : G.text,
    };

    switch (card.type) {
      case 'emi':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.accent, textTransform: 'uppercase', marginBottom: 6 }}>Loan Calculator Results</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12 }}>
              <div><span style={{ color: G.muted }}>Principal:</span></div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(card.principal)}</div>
              <div><span style={{ color: G.muted }}>Interest Rate:</span></div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{card.interestRate}% Flat</div>
              <div><span style={{ color: G.muted }}>Tenure:</span></div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{card.tenureMonths} Months</div>
              <div style={{ borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`, paddingTop: 6, marginTop: 4 }}><span style={{ color: G.muted }}>Total Interest:</span></div>
              <div style={{ borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`, paddingTop: 6, marginTop: 4, textAlign: 'right', fontWeight: 600, color: G.warn }}>{formatCurrency(card.totalInterest)}</div>
              <div><span style={{ color: G.muted }}>Total Amount:</span></div>
              <div style={{ textAlign: 'right', fontWeight: 600, color: G.info }}>{formatCurrency(card.totalAmountDue)}</div>
              <div style={{ gridColumn: 'span 2', background: isDarkMode ? '#0E1730' : '#F8FAFC', padding: 8, borderRadius: 4, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: isDarkMode ? '#FFFFFF' : G.text, fontSize: 11 }}>MONTHLY EMI:</span>
                <span style={{ fontWeight: 700, color: G.success, fontSize: 14 }}>{formatCurrency(card.monthlyEmi)}</span>
              </div>
            </div>
          </div>
        );
      case 'diagnostics':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.success, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: G.success }} />
              System Diagnostic Report
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>REST Endpoint:</span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{card.serverUrl}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Network Latency:</span><span style={{ color: G.success, fontWeight: 600 }}>12ms (Optimal)</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Active Branches:</span><span style={{ fontWeight: 600 }}>{card.branchesCount}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Customer Dossiers:</span><span style={{ fontWeight: 600 }}>{card.customerCount}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Active Field Agents:</span><span style={{ color: G.info, fontWeight: 600 }}>{card.activeAgents} / {card.agentsCount}</span></div>
              <div style={{ borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`, paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: isDarkMode ? '#FFFFFF' : G.text, fontSize: 11 }}>TODAY'S LIQUIDITY:</span>
                <span style={{ fontWeight: 700, color: G.success }}>{formatCurrency(card.todayCollection)}</span>
              </div>
            </div>
          </div>
        );
      case 'agent':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.accent, textTransform: 'uppercase', marginBottom: 6 }}>Agent Profile Card</div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Name:</span><span style={{ fontWeight: 600 }}>{card.data.name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Role:</span><span style={{ textTransform: 'capitalize' }}>{card.data.role.toLowerCase()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Phone:</span><span>{card.data.phoneNumber || 'N/A'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Max Cash Limit:</span><span style={{ color: G.danger, fontWeight: 600 }}>{formatCurrency(card.data.maxCashHoldingLimit)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Daily Coll. Limit:</span><span style={{ color: G.info, fontWeight: 600 }}>{formatCurrency(card.data.dailyCollectionLimit)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Binding Status:</span>
                <span style={{ color: card.data.registeredDeviceId ? G.success : G.warn, fontWeight: 600 }}>
                  {card.data.registeredDeviceId ? 'BOUND' : 'UNBOUND'}
                </span>
              </div>
            </div>
            <button
              style={{
                width: '100%',
                background: G.sidebarBg,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                setIsOpen(false);
                setEditAgent(card.data);
              }}
            >
              Configure Agent Security
            </button>
          </div>
        );
      case 'customer':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.accent, textTransform: 'uppercase', marginBottom: 6 }}>Customer Dossier</div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Name:</span><span style={{ fontWeight: 600 }}>{card.data.name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>A/C Number:</span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{card.data.accountNumber}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Phone:</span><span>{card.data.phoneNumber || 'N/A'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>KYC Status:</span>
                <span style={{ color: card.data.kycStatus === 'VERIFIED' ? G.success : G.warn, fontWeight: 600 }}>
                  {card.data.kycStatus || 'PENDING'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Current Balance:</span><span style={{ color: G.success, fontWeight: 600 }}>{formatCurrency(card.data.currentBalance)}</span></div>
            </div>
            <button
              style={{
                width: '100%',
                background: G.sidebarBg,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                setIsOpen(false);
                setSelectedCustomer(card.data);
              }}
            >
              Open Dossier Detail
            </button>
          </div>
        );
      case 'loan':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.accent, textTransform: 'uppercase', marginBottom: 6 }}>Loan Maturation Log</div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Borrower:</span><span style={{ fontWeight: 600 }}>{card.customerName}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Principal:</span><span style={{ fontWeight: 600 }}>{formatCurrency(card.loan.principalAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Paid Maturation:</span><span style={{ color: G.success, fontWeight: 600 }}>{formatCurrency(card.loan.amountPaid)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: G.muted }}>Outstanding Debt:</span><span style={{ color: G.danger, fontWeight: 600 }}>{formatCurrency(card.loan.outstandingLoan)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${isDarkMode ? '#1E2D5A' : G.border}`, paddingTop: 6, marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: isDarkMode ? '#FFFFFF' : G.text, fontSize: 10 }}>MONTHLY EMI:</span>
                <span style={{ fontWeight: 700, color: G.info }}>{formatCurrency(card.loan.monthlyEmiAmount)}</span>
              </div>
            </div>
          </div>
        );
      case 'audit':
        return (
          <div style={cardBgStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: G.info, textTransform: 'uppercase', marginBottom: 6 }}>Recent Ledger Audits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.transactions.map((tx, idx) => (
                <div key={idx} style={{ borderBottom: idx < card.transactions.length - 1 ? `1px solid ${isDarkMode ? '#1E2D5A' : '#F1F5F9'}` : 'none', paddingBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: tx.transactionCategory === 'LOAN_REPAYMENT' ? G.warn : G.success }}>
                      {tx.transactionCategory === 'LOAN_REPAYMENT' ? 'EMI Repayment' : 'Deposit'}
                    </div>
                    <div style={{ fontSize: 10, color: G.muted }}>
                      {new Date(tx.transactionDate).toLocaleDateString()} · {tx.paymentMode}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: isDarkMode ? '#FFFFFF' : G.text }}>
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  }
}
