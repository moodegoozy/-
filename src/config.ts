export const DEVELOPER_ACCESS_SESSION_KEY = 'developer:console:access'

export const developerAccessCode =
  (import.meta.env.VITE_DEVELOPER_ACCESS_CODE ? String(import.meta.env.VITE_DEVELOPER_ACCESS_CODE) : '').trim()
