import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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

function offlineShellPlugin(): Plugin {
  return {
    name: 'offline-shell',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => fileName.startsWith('assets/'))
        .map((fileName) => `/${fileName}`)
      const precache = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/favicon-32.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', ...assets]
      const version = createHash('sha256').update(JSON.stringify(precache)).digest('hex').slice(0, 12)
      const template = await readFile(resolve(import.meta.dirname, 'scripts/pwa/service-worker.template.js'), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: template
          .replace('__SHELL_CACHE__', `ad-astra-shell-${version}`)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), yamlPlugin(), offlineShellPlugin()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
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
