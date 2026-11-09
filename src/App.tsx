import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { CalendarProvider } from '@/app/providers/CalendarProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import AuthLayout from '@/app/layouts/AuthLayout'
import UserLayout from '@/app/layouts/UserLayout'

const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(module => ({ default: module.CalendarPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const DailyFlowPage = lazy(() => import('@/pages/DailyFlowPage').then(module => ({ default: module.DailyFlowPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(module => ({ default: module.LoginPage })))
const RoutinePage = lazy(() => import('@/pages/RoutinePage').then(module => ({ default: module.default })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })))

const AppRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div role="status" className="p-6 text-center">Carregando...</div>
  }

  return (
    <Suspense fallback={<div role="status" className="p-6 text-center">Carregando página...</div>}>
      <Routes>
        <Route
          element={isAuthenticated ? <Navigate to="/calendar" replace /> : <AuthLayout />}
        >
          <Route path="/login" element={<LoginPage key="login" />} />
          <Route path="/register" element={<LoginPage key="register" initialMode="register" />} />
        </Route>
        <Route
          element={isAuthenticated ? <UserLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/overview" element={<DashboardPage />} />
          <Route path="/flow" element={<DailyFlowPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/agenda/:date?" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendars" element={<Navigate to="/calendar" replace />} />
          <Route path="/routine" element={<RoutinePage />} />
          <Route path="/settings" element={<SettingsPage userId={user?.id ?? ''} />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated && user ? '/calendar' : '/login'} replace />}
        />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CalendarProvider>
          <AppRoutes />
        </CalendarProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
