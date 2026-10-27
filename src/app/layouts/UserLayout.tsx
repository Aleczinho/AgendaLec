import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CalendarDays, CalendarClock, LayoutDashboard, LogOut, Menu, Settings, X } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'

const navigation = [
  { to: '/overview', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/routine', label: 'Rotina', icon: CalendarClock },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

const UserLayout = () => {
  const { logout, displayName, email } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMenu = () => setMobileMenuOpen(false)
  const handleLogout = async () => {
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Unable to sign out:', error)
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.')
    }
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <NavLink to="/calendar" className="brand-lockup" onClick={closeMenu}>
          <span className="brand-mark"><CalendarDays size={19} /></span>
          <span>Agenda<span className="brand-accent">Lec</span></span>
        </NavLink>
        <button
          type="button"
          className="icon-button mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {mobileMenuOpen && <button className="mobile-menu-scrim" onClick={closeMenu} aria-label="Fechar menu" />}
      <aside className={`app-sidebar${mobileMenuOpen ? ' is-open' : ''}`}>
        <NavLink to="/calendar" className="brand-lockup desktop-brand" onClick={closeMenu}>
          <span className="brand-mark"><CalendarDays size={19} /></span>
          <span>Agenda<span className="brand-accent">Lec</span></span>
        </NavLink>

        <div className="sidebar-section-label">MENU</div>
        <nav className="sidebar-navigation" aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              to={to}
              key={to}
              end={to === '/calendar'}
              onClick={closeMenu}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">
            {(displayName || email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="account-details">
            <strong>{displayName || 'Minha conta'}</strong>
            <span>{email}</span>
          </div>
          <button type="button" className="icon-button logout-button" onClick={() => void handleLogout()} aria-label="Sair" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="app-main">
        {logoutError && <p role="alert" className="inline-error app-notice">{logoutError}</p>}
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout
