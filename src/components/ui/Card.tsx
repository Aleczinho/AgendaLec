import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  hasHeader?: boolean
  hasFooter?: boolean
  className?: string
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(props => {
  const {
    variant = 'default',
    hasHeader = false,
    hasFooter = false,
    className,
    ...attrs
  } = props

  const baseClasses = 'card'

  return (
    <div
      className={cn(baseClasses, className)}
      {...attrs}
    )
  )
})

Card.displayName = 'Card'

export { Card, CardProps }