import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { AuthContext } from '../App'

export default function Login() {
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', form)
      login(res.data.user, res.data.token)
      toast.success('Welcome back, ' + res.data.user.username + '!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">⬡</span>
          <h1>DDAi</h1>
          <p>// intelligent conversations</p>
        </div>
        <div className="auth-features">
          {[
            ['🧠', 'Advanced AI', 'Powered by Claude AI'],
            ['💾', 'Chat History', 'All chats saved securely'],
            ['⚡', 'Fast Responses', 'Instant AI replies'],
            ['🔒', 'Secure', 'JWT auth + encrypted data'],
          ].map(([icon, title, desc]) => (
            <div className="auth-feature" key={title}>
              <span>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{title}</div>
                <div style={{ fontSize: '0.75rem', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to continue your conversations</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
          <div className="auth-switch">
            Don't have an account?
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}