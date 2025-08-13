'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger, SheetContent } from './sheet'
// import SheetCon
import { Menu, X } from 'lucide-react'

interface MobileMenuProps {
  children: React.ReactNode
  className?: string
}

export function MobileMenu({ children, className }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('lg:hidden', className)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="py-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}