import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig({
  plugins: viteConfig.plugins,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
