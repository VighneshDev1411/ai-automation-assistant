'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function WorkflowLoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="relative">
        {/* Animated circles */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary" />
        </motion.div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="h-12 w-12 rounded-full border-4 border-secondary/20 border-t-secondary" />
        </motion.div>
        
        {/* Center icon */}
        <div className="relative h-16 w-16 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-6 w-6 bg-primary rounded-full"
          />
        </div>
      </div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="ml-6 text-muted-foreground"
      >
        Loading workflows...
      </motion.p>
    </div>
  )
}