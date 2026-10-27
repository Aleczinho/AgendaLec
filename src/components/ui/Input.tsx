import { cn } from '@/lib/utils'

interface InputProps extends React.LabelHTMLAttributes<HTMLInputElement> {
  type?: string
  size?: 'sm' | 'md' | 'lg'
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(props => {
  const {
    type,
    size = 'md',
    error,
    className,
    ...attrs
  } = props

  const sizeClasses = {
    sm: 'input-sm',
    md: '',
    lg: '',
  }[size]

  return (
    <div className="space-y-1">
      <input
        type={type}
        className={cn(
          'input',
          sizeClasses,
          error && 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
          className,
        )}
        {...attrs}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export { Input, InputProps }