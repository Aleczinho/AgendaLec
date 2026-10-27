import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'
import './styles/responsive.css'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { CalendarProvider } from '@/app/providers/CalendarProvider'
import DashboardLayout from '@/app/layouts/UserLayout'
import AuthLayout from '@/app/layouts/AuthLayout'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CalendarProvider>
          {/* Public routes (authenticated users can access these too, or use route protection) */}
          {/* Routes are defined in @react-router/dev/routes */}
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App