import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'main' ? 'index.js' : '[name].js'
        },
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
      input: {
        main: './index.html',
        embed: './embed.html',
      }
    }
  }
})
