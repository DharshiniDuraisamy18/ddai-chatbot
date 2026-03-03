/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, createContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import Chat from './components/Chat.jsx'
import './App.css'

export const AuthContext = createContext()

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    let parsedUser = null
    if (token && userData) {
      try {
        parsedUser = JSON.parse(userData)
      } catch (e) {
        console.error(e)
      }
    }
    
    setUser(parsedUser)
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) return (
    <div className="splash">
      <div className="splash-logo">
        <span className="splash-icon">⬡</span>
        <span>DDAi</span>
      </div>
    </div>
  )

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #2d2d5e' }
        }} />
        <Routes>
          <Route path="/login"    element={!user ? <Login />    : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/"         element={user  ? <Chat />     : <Navigate to="/login" />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}