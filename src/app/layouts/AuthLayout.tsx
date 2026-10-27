import { CalendarDays, CheckCircle2, Clock3 } from 'lucide-react'
import { Outlet } from 'react-router-dom'

const AuthLayout = () => (
  <div className="auth-layout">
    <aside className="auth-promo">
      <div className="auth-brand"><span className="brand-mark"><CalendarDays size={21} /></span>Agenda<span>Lec</span></div>
      <div className="auth-promo-copy">
        <p className="auth-kicker">Mais leveza para o seu dia</p>
        <h1>Seu tempo merece uma agenda que acompanha você.</h1>
        <p>Planeje sua rotina, reúna seus compromissos e deixe espaço para o que realmente importa.</p>
      </div>
      <div className="auth-highlights">
        <div><CheckCircle2 size={18} /><span>Organize compromissos em um só lugar</span></div>
        <div><Clock3 size={18} /><span>Visualize seu dia, semana ou mês</span></div>
      </div>
      <div className="auth-promo-foot">Uma rotina mais simples começa com um bom plano.</div>
    </aside>
    <main className="auth-main"><Outlet /></main>
  </div>
)

export default AuthLayout
