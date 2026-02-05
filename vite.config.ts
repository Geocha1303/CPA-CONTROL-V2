
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy removido: A conexão agora é feita via Google Apps Script Bridge para contornar CORS em produção
  build: {
    outDir: 'dist',
  }
})
