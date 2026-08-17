import { parse } from 'yaml'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function yamlPlugin(): Plugin {
  return {
    name: 'yaml',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) return
      return {
        code: `export default ${JSON.stringify(parse(code))}`,
        map: null,
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), yamlPlugin()],
  css: {
    transformer: 'lightningcss',
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', 'astronomy-engine'],
  },
  build: {
    target: 'es2022',
    minify: 'oxc',
    cssMinify: 'lightningcss',
    sourcemap: false,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)\b/ },
            { name: 'three', test: /node_modules[\\/]three\b/ },
            { name: 'astronomy', test: /node_modules[\\/]astronomy-engine\b/ },
          ],
        },
      },
    },
  },
})
