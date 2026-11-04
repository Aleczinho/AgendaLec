import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/app/providers/AuthProvider'

interface LoginPageProps {
  initialMode?: 'login' | 'register'
}

export const LoginPage = ({ initialMode = 'login' }: LoginPageProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode] = useState<'login' | 'register'>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const { login, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    setIsLoading(true)

    try {
      if (mode === 'register') {
        await signUp(email, password)
        navigate('/calendar', { replace: true })
      } else {
        await login(email, password)
        navigate('/calendar', { replace: true })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const status = error && typeof error === 'object' && 'status' in error
        ? error.status
        : undefined
      setErrorMessage(
        status === 429
          ? 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.'
          : message || 'Não foi possível concluir a operação.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const title = mode === 'register' ? 'Criar conta' : 'Bem-vindo(a)'

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card-heading">
          <p className="eyebrow">{mode === 'register' ? 'Comece agora' : 'Bem-vindo de volta'}</p>
          <h1>{title}</h1>
          <p>{mode === 'register' ? 'Crie sua conta para organizar sua rotina.' : 'Entre para continuar sua organização.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
          </div>

          {errorMessage && <p role="alert" className="auth-message auth-error">{errorMessage}</p>}
          {notice && <p role="status" className="auth-message auth-success">{notice}</p>}

          <Button type="submit" disabled={isLoading} className="auth-submit">
            {isLoading ? 'Aguarde...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <p>Não tem uma conta? <Link className="text-primary" to="/register">Cadastre-se</Link></p>
          )}
          {mode === 'register' && (
            <p>Já tem uma conta? <Link className="text-primary" to="/login">Entrar</Link></p>
          )}
        </div>
      </div>
    </section>
  )
}
