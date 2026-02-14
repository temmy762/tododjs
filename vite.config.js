import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.code, err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Disable all timeouts on the proxy request socket
            proxyReq.setTimeout(0);
            if (proxyReq.socket) proxyReq.socket.setTimeout(0);
            // Disable timeout on the original request too
            req.setTimeout(0);
            if (req.socket) req.socket.setTimeout(0);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Disable timeout on response socket
            proxyRes.setTimeout(0);
            if (proxyRes.socket) proxyRes.socket.setTimeout(0);
            res.setTimeout(0);
            if (res.socket) res.socket.setTimeout(0);
          });
        }
      }
    }
  }
})
