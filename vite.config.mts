import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // Lê também variáveis sem prefixo VITE_ (ex.: API_PORT) só para configurar o proxy de desenvolvimento.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.DEV_API_URL || `http://localhost:${env.API_PORT || 3001}`

  return {
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || './',
    build: {
      outDir: 'dist',
      sourcemap: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor',
                test: /node_modules[\\/]/,
                minShareCount: 2,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      // Em desenvolvimento, /api vai para o servidor Node (npm run dev:api).
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
