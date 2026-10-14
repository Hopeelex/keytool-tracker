import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl() // Esto fuerza el HTTPS
  ],
  server: {
    // Esto evita que el navegador bloquee a FastAPI por no tener HTTPS
    proxy: {
      '/api': {
        target: 'http://192.168.1.XX:8000', // <-- PON AQUÍ LA IP REAL DE FASTAPI
        changeOrigin: true,
        secure: false,
      }
    }
  }
})