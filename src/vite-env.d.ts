/// <reference types="vite/client" />

declare module '*.yaml' {
  const data: unknown
  export default data
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
