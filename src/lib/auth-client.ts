import { createAuthClient } from 'better-auth/react'

// VITE_API_URL é o prefixo da API (por exemplo /api ou https://api.exemplo.com/api).
// O Better Auth usa /api/auth por padrão; basePath mantém compatibilidade com esse prefixo.
const configuredApiUrl = import.meta.env.VITE_API_URL || '/api'
const apiUrl = new URL(configuredApiUrl, window.location.origin)
const apiPath = apiUrl.pathname.replace(/\/+$/, '')

export const authClient = createAuthClient({
  baseURL: apiUrl.origin,
  basePath: `${apiPath}/auth`,
  fetchOptions: { credentials: 'include' },
})
