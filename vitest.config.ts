import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { 
      deps: { 
        inline: [
          "convex-test",
          // Inline all convex modules to ensure they're available in edge-runtime
          /convex/
        ] 
      } 
    },
  },
})