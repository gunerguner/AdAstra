/// <reference types="vite/client" />

declare module '*.yaml' {
  const data: unknown
  export default data
}
