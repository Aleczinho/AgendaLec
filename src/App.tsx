import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'
import './styles/responsive.css'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { CalendarProvider } from '@/app/providers/CalendarProvider'
import DashboardLayout from '@/app/layouts/UserLayout'
import AuthLayout from '@/app/layouts/AuthLayout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

function App() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  // Redirecionar usuários não autenticados para login
  useEffect(() => {
    if (!isAuthenticated && !user) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, user])

  if (!isAuthenticated && !user) {
    // Temporariamente renderiza login enquanto auth estado é verificado
    return (
      <AuthLayout>
        <div className="auth-container">
          <h2>AgendaLec</h2>
          <p>Por favor, faça login para acessar a agenda</p>
          <div className="auth-box">
            <form>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="seu@email.com" required />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input type="password" placeholder="minhasenha" required />
              </div>
              <button type="submit" className="btn-primary">Entrar</button>
            </form>
            <p>Não tem uma conta? <a href="/register">Registre-se</a></p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <CalendarProvider>
          {isAuthenticated ? (
            <DashboardLayout>
              <nav>
                <ul>
                  <li><a href="/agenda">Agenda</a></li>
                  <li><a href="/calendars">Calendários</a></li>
                  <li><a href="/profile">Perfil</a></li>
                  <li>
                    <a href="/logout" onClick={(e) => {
                      e.preventDefault()
                      // logout would be called here
                    }}>Sair</a>
                  </li>
                </ul>
              </nav>
              <div className="main-content">
                {/* Routes content */}
              </div>
            </DashboardLayout>
          ) : (
            <AuthLayout>
              <div className="auth-container">
                <h2>AgendaLec</h2>
                <p>Gerencie sua agenda pessoal de forma simples</p>
                <div className="auth-box">
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    // Login handling
                  }}>
                    <h3>Login</h3>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" placeholder="seu@email.com" required />
                    </div>
                    <div className="form-group">
                      <label>Senha</label>
                      <input type="password" placeholder="minhasenha" required />
                    </div>
                    <button type="submit" className="btn-primary">Entrar</button>
                  </form>
                  <p>Não tem uma conta? <a href="/register">Registre-se</a></p>
                </div>
              </div>
            </AuthLayout>
          )}
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App