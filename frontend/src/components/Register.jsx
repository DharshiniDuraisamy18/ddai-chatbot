import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { AuthContext } from '../App'

export default function Register() {
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/register', form)
      login(res.data.user, res.data.token)
      toast.success('Account created! Welcome to DDAi!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
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
            ['🚀', 'Get Started Free', 'No credit card required'],
            ['🔄', 'Multi-session', 'Manage multiple chats'],
            ['🌐', 'Always Available', '24/7 AI assistance'],
            ['✨', 'Smart Context', 'Remembers conversation'],
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
          <h2>Create account</h2>
          <p className="subtitle">Join DDAi and start chatting with AI</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="johndoe"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
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
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
          <div className="auth-switch">
            Already have an account?
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}