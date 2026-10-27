import { Outlet, Navigate } from 'react-router-dom'

const AuthLayout = () => {
  // If user is already authenticated, redirect to calendar
  const navigate = window.navigator as any // simplified

  return (
    <div className="min-h-screen bg-bg dark:bg-gray-900 flex items-center justify-center">
      <Outlet />
      {/* Redirect after a moment if authenticated */}
      {/* if (isAuthenticated) { navigate('/calendar', { replace: true }) } */}
    </div>
  )
}

export default AuthLayout