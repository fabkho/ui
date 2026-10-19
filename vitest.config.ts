import { defineConfig } from 'vitest/config'

// Plain Node, no Nuxt runtime: what the base tests is pure (utils, the contract),
// the components are checked in the apps that use them.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
