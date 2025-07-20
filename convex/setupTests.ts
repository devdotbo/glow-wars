// Setup file to help convex-test find modules in edge-runtime
export const modules = import.meta.glob('./**/*.{js,ts}', {
  import: 'default',
})