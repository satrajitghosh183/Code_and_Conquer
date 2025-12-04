import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  
  return {
    plugins: [react()],
    
    server: {
      port: 3000,
      strictPort: true, // Force port 3000, error if unavailable (OAuth requires this exact port)
      host: true, // Listen on all interfaces
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
          changeOrigin: true,
          ws: true
        }
      }
    },
    
    preview: {
      port: 3000,
      strictPort: true
    },
    
    build: {
      outDir: 'dist',
      sourcemap: isDev, // Only sourcemaps in dev
      minify: 'terser',
      target: 'es2020',
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: true,
          pure_funcs: isDev ? [] : ['console.log', 'console.debug']
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React
            'react-vendor': ['react', 'react-dom'],
            // Routing
            'router': ['react-router-dom'],
            // 3D Graphics
            'three': ['three'],
            // Code Editor
            'editor': ['@monaco-editor/react'],
            // Charts
            'charts': ['recharts'],
            // UI Icons
            'icons': ['lucide-react'],
            // Supabase
            'supabase': ['@supabase/supabase-js']
          },
          // Asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      },
      // Increase chunk size warning limit (Three.js is large)
      chunkSizeWarningLimit: 1000
    },
    
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    },
    
    // Optimize deps
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'three'],
      exclude: []
    },
    
    // CSS configuration
    css: {
      devSourcemap: isDev
    },
    
    // Enable JSON imports
    json: {
      stringify: true
    }
  }
})
