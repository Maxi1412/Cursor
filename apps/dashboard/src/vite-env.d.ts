/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORCH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
