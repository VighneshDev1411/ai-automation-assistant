export const APP_CONFIG = {
  name: 'AI Automation Platform',
  description: 'Enterprise-grade workflow automation with AI agents',
  version: '1.0.0',
  author: 'AI Automation Platform Team',
  repository: 'https://github.com/your-org/ai-automation-platform',
} as const

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  WORKFLOWS: '/workflows',
  INTEGRATIONS: '/integrations',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
} as const

export const API_ENDPOINTS = {
  WORKFLOWS: '/api/workflows',
  INTEGRATIONS: '/api/integrations',
  USERS: '/api/users',
  ANALYTICS: '/api/analytics',
} as const

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const

export const STORAGE_KEYS = {
  THEME: 'theme',
  SIDEBAR_STATE: 'sidebar-state',
  USER_PREFERENCES: 'user-preferences',
} as const