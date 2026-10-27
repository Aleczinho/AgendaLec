import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'primary',
    size = 'md',
    type = 'button',
    className,
    children,
    ...attrs
  } = props

  const sizeStyles = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
  }[size]

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-primary-dark',
    secondary:
      'bg-transparent text-primary border border-primary hover:bg-primary-light',
    ghost:
      'bg-transparent text-secondary hover:text-primary',
    accent:
      'bg-accent text-primary hover:bg-accent-light',
    danger:
      'bg-red text-white hover:bg-red-dark',
  }[variant]

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        sizeStyles,
        variantStyles,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...attrs}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }