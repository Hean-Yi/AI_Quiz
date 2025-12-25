import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const dualEntryLog = () => ({
  name: 'dual-entry-log',
  configureServer(server) {
    const logUrls = () => {
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') return
      const host = typeof server.config.server.host === 'string'
        ? server.config.server.host
        : 'localhost'
      const protocol = server.config.server.https ? 'https' : 'http'
      const baseUrl = `${protocol}://${host}:${address.port}`
      server.config.logger.info(`\n  Desktop: ${baseUrl}/desktop`)
      server.config.logger.info(`  Mobile:  ${baseUrl}/`)
    }

    server.httpServer?.once('listening', logUrls)
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), dualEntryLog()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
