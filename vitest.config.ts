import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

const vitePlugins = Array.isArray(viteConfig.plugins) ? viteConfig.plugins : []

export default mergeConfig(
  {
    ...viteConfig,
    plugins: vitePlugins.filter((plugin) => {
      if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) return true
      return !('name' in plugin && plugin.name === 'offline-shell')
    }),
    build: undefined,
  },
  defineConfig({
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  }),
)
