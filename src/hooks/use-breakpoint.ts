'use client'

import { useMediaQuery } from './use-media-query'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface BreakpointQueries {
  isSm: boolean
  isMd: boolean
  isLg: boolean
  isXl: boolean
  is2Xl: boolean
  isAboveSm: boolean
  isAboveMd: boolean
  isAboveLg: boolean
  isAboveXl: boolean
  isBelowSm: boolean
  isBelowMd: boolean
  isBelowLg: boolean
  isBelowXl: boolean
  isBellow2Xl: boolean
  active: Breakpoint
}

export function useBreakpoint(): BreakpointQueries {
  const isSm = useMediaQuery('(min-width: 640px)')
  const isMd = useMediaQuery('(min-width: 768px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')
  const is2Xl = useMediaQuery('(min-width: 1536px)')

  const isAboveSm = isSm
  const isAboveMd = isMd
  const isAboveLg = isLg
  const isAboveXl = isXl

  const isBelowSm = !isSm
  const isBelowMd = !isMd
  const isBelowLg = !isLg
  const isBelowXl = !isXl
  const isBellow2Xl = !is2Xl

  const getActiveBreakpoint = (): Breakpoint => {
    if (is2Xl) return '2xl'
    if (isXl) return 'xl'
    if (isLg) return 'lg'
    if (isMd) return 'md'
    return 'sm'
  }

  return {
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isAboveSm,
    isAboveMd,
    isAboveLg,
    isAboveXl,
    isBelowSm,
    isBelowMd,
    isBelowLg,
    isBelowXl,
    isBellow2Xl,
    active: getActiveBreakpoint(),
  }
}