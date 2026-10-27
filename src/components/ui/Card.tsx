import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  hasHeader?: boolean
  hasFooter?: boolean
  className?: string
}

const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const {
    variant = 'default',
    hasHeader = false,
    hasFooter = false,
    className,
    children,
    ...attrs
  } = props

  const baseClasses = 'card'

  return (
    <div
      ref={ref}
      className={cn(baseClasses, className)}
      {...attrs}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

export { Card }
export type { CardProps }