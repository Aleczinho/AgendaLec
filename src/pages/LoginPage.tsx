import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabaseConfigured, supabaseConfigurationError } from '@/lib/supabase'

interface LoginPageProps {
  initialMode?: 'login' | 'register'
}

export const LoginPage = ({ initialMode = 'login' }: LoginPageProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const { login, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    setIsLoading(true)

    try {
      if (mode === 'reset') {
        await resetPassword(email)
        setNotice('Se o endereço estiver cadastrado, você receberá instruções para redefinir a senha.')
      } else if (mode === 'register') {
        const authenticated = await signUp(email, password)
        if (authenticated) {
          navigate('/calendar', { replace: true })
        } else {
          setNotice('Cadastro realizado. Verifique seu e-mail para confirmar a conta.')
        }
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
        status === 429 || /too many requests|rate limit/i.test(message)
          ? 'O Supabase limitou temporariamente as tentativas. Aguarde alguns minutos antes de tentar novamente. Se continuar, confira Authentication > Rate Limits no painel do projeto.'
          : /invalid api key/i.test(message)
            ? 'A chave de acesso do Supabase está inválida. Confira VITE_SUPABASE_PUBLISHABLE_KEY no .env e reinicie o servidor.'
            : message || 'Não foi possível concluir a operação.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const title = mode === 'register' ? 'Criar conta' : mode === 'reset' ? 'Redefinir senha' : 'Bem-vindo(a)'

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card-heading">
          <p className="eyebrow">{mode === 'register' ? 'Comece agora' : mode === 'reset' ? 'Recuperação segura' : 'Bem-vindo de volta'}</p>
          <h1>{title}</h1>
          <p>{mode === 'register' ? 'Crie sua conta para organizar sua rotina.' : mode === 'reset' ? 'Informe seu e-mail para receber as instruções.' : 'Entre para continuar sua organização.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!supabaseConfigured && <p role="alert" className="auth-message auth-error">{supabaseConfigurationError}</p>}
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

          {mode !== 'reset' && (
            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </div>
          )}

          {errorMessage && <p role="alert" className="auth-message auth-error">{errorMessage}</p>}
          {notice && <p role="status" className="auth-message auth-success">{notice}</p>}

          <Button type="submit" disabled={isLoading} className="auth-submit">
            {isLoading ? 'Aguarde...' : mode === 'register' ? 'Criar conta' : mode === 'reset' ? 'Enviar instruções' : 'Entrar'}
          </Button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button type="button" className="text-primary" onClick={() => setMode('reset')}>
                Esqueci minha senha
              </button>
              <p>Não tem uma conta? <Link className="text-primary" to="/register">Cadastre-se</Link></p>
            </>
          )}
          {mode === 'register' && (
            <p>Já tem uma conta? <Link className="text-primary" to="/login">Entrar</Link></p>
          )}
          {mode === 'reset' && (
            <button type="button" className="text-primary" onClick={() => setMode('login')}>
              Voltar para entrar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
