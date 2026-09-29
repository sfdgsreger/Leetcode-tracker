import { Routes, Route, Navigate } from 'react-router-dom'

// Layout & guards
import Layout        from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Public auth pages (no nav shell needed)
import Login          from './pages/Login'
import Signup         from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'

// Protected app pages
import Dashboard  from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'

export default function App() {
  return (
    <Routes>
      {/*
       * ── Public routes ──────────────────────────────────────────────
       * These render without the Layout shell (no Navbar/footer)
       * so the auth screens stay clean and centred.
       */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/*
       * ── Protected routes ───────────────────────────────────────────
       * Wrapped in Layout (Navbar + footer) and ProtectedRoute guard.
       */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/*
       * ── Redirects ──────────────────────────────────────────────────
       * Root → dashboard (ProtectedRoute will redirect to /login if
       * the user isn't authenticated).
       * Anything else → root.
       */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/"          replace />} />
    </Routes>
  )
}
