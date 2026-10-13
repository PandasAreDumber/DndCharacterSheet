/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const certificate = fileURLToPath(new URL('./.local/localhost-cert.pem', import.meta.url))
  const privateKey = fileURLToPath(new URL('./.local/localhost-key.pem', import.meta.url))
  const localHttps = mode === 'https' && existsSync(certificate) && existsSync(privateKey)
  const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_')

  return {
    plugins: [react(), tailwindcss()],
    server: localHttps ? {
      https: { cert: readFileSync(certificate), key: readFileSync(privateKey) },
      strictPort: true,
      proxy: env.VITE_FIREBASE_PROJECT_ID ? {
        '/__/auth': { target: `https://${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`, changeOrigin: true },
      } : undefined,
    } : undefined,
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
