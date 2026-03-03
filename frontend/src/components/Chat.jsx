import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { AuthContext } from '../App';

const api = axios.create({ baseURL: 'https://ddai-backend.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function Chat() {
  const { user, logout } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
    } catch  (err) {
      console.error(err);
    }
  };

  const loadSession = async (sessionId) => {
    setCurrentSession(sessionId);
    setLoading(true);
    try {
      const res = await api.get(`/chat/history/${sessionId}`);
      setMessages(res.data);
    } catch {
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    const id = uuidv4();
    setCurrentSession(id);
    setMessages([]);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.delete(`/chat/session/${sessionId}`);
      setSessions(s => s.filter(s => s._id !== sessionId));
      if (currentSession === sessionId) { setCurrentSession(null); setMessages([]); }
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;

    const sessionId = currentSession || uuidv4();
    if (!currentSession) setCurrentSession(sessionId);

    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/chat', { message: msg, sessionId, history });

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, timestamp: new Date() }]);
      fetchSessions();
    } catch {
      toast.error('Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    "What can you help me with?",
    "Explain machine learning simply",
    "Write a Python function for sorting",
    "Tell me something interesting"
  ];

  return (
    <div className="chat-app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Close button for mobile */}
  <button 
    className="sidebar-close-btn" 
    onClick={() => setSidebarOpen(false)}
  >✕</button>
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">⬡</span>
            <span className="brand-name">DDAi<span>Bot</span></span>
          </div>
          <button className="btn-new-chat" onClick={newChat}>
            <span>+</span> New Conversation
          </button>
        </div>

        <div className="sessions-label">Recent Chats</div>
        <div className="sessions-list">
          {sessions.length === 0 && (
            <div style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No conversations yet
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s._id}
              className={`session-item ${currentSession === s._id ? 'active' : ''}`}
              onClick={() => loadSession(s._id)}
            >
              <div className="session-text">
                <div className="session-preview">{s.lastMessage}</div>
                <div className="session-time">{formatDate(s.lastTime)}</div>
              </div>
              <button className="session-delete" onClick={e => deleteSession(e, s._id)}>✕</button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-status">● Online</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout} title="Logout">⎋</button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="chat-main">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="chat-header-info">
              <h3>DDAi Assistant</h3>
              <p><span className="online-dot"></span> Ready to help</p>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn" onClick={newChat}>+ New Chat</button>
          </div>
        </div>

        <div className="messages-area">
          {messages.length === 0 && !loading ? (
            <div className="empty-state">
              <span className="empty-icon">⬡</span>
              <h3>How can I help you today?</h3>
              <p>I'm DDAi, your AI assistant. Ask me anything — I'm here to help.</p>
              <div className="suggestion-chips">
                {suggestions.map(s => (
                  <button key={s} className="chip" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  <div className="msg-avatar">
                    {msg.role === 'user' ? user?.username?.[0]?.toUpperCase() : '⬡'}
                  </div>
                  <div className="msg-content">
                    <div className="msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    <div className="msg-time">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="message-row bot">
                  <div className="msg-avatar">⬡</div>
                  <div className="msg-content">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Type your message..."
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || typing}>
              ➤
            </button>
          </div>
          <p className="input-hint"><kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</p>
        </div>
      </div>
    </div>
  );
}
