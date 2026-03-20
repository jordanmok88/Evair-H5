/// <reference types="vite/client" />

interface ImportMetaHot {
  send: (event: string, data?: unknown) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback: (data: unknown) => void) => void;
}

interface ImportMeta {
  hot: ImportMetaHot | undefined;
  env: {
    VITE_API_BASE_URL?: string;
    [key: string]: string | undefined;
  };
}