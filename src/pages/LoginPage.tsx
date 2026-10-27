import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Auth logic would go here
    setTimeout(() => {
      setIsLoading(false)
      // Navigate to dashboard after login
    }, 1000)
  }

  return (
    <section className="min-h-screen bg-bg dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-6">
          <X className="h-6 w-6 opacity-50 cursor-pointer" />
          <h2 className="text-2xl font-bold">Bem-vindo(a)</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">E-mail</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Senha</label>
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>

          <div className="text-center text-sm">
            <a href="#" className="text-primary hover/underline">
              Esqueci minha senha
            </a>
          </div>
        </form>
      </div>
    </section>
  )
}