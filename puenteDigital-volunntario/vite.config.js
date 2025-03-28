import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [vue(),
    nodePolyfills({
      // Para incluir polyfills específicos
      include: ['buffer', 'process', 'stream', 'events'],
      // Alternativa: para incluir todos los polyfills (puede aumentar el tamaño del bundle)
      // global: true,
    }),
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000, 
    host: '0.0.0.0' 
  }
})