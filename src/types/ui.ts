import { LucideIcon } from 'lucide-react'

export type Size = 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
export type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends BaseComponentProps {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onClick?: () => void
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  error?: string
  required?: boolean
  onChange?: (value: string) => void
}

export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: Size
  hover?: boolean
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: Size
  closeOnOverlayClick?: boolean
}

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface NavigationItem {
  label: string
  href: string
  icon?: LucideIcon
  badge?: string | number
  children?: NavigationItem[]
}

export interface Theme {
  mode: 'light' | 'dark' | 'system'
  primary: string
  secondary: string
  accent: string
}