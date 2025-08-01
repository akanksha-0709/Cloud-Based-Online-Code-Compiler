/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT?: string
  readonly VITE_AWS_REGION?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
