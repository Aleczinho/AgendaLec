import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'onSelect' | 'size'> {
  options: Option[]
  value?: string | number
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  onSelect?: (value: string | number) => void
  placeholder?: string
  searchable?: boolean
  error?: string
  size?: 'sm' | 'md'
}

const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const {
    options,
    value,
    onSelect,
    placeholder,
    searchable = false,
    error,
    size = 'md',
    onChange,
    className,
    ...attrs
  } = props

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e)
    if (onSelect) onSelect(e.target.value)
  }

  return (
    <div className="space-y-1">
      <select
        ref={ref}
        {...attrs}
        value={value}
        className={cn(
          'select',
          size === 'sm' && 'select-sm',
          searchable && 'pr-8', // space for search icon
          error && 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
          className,
        )}
        onChange={handleChange}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (
          <option
            key={option.value}
            value={option.value.toString()}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export { Select }
export type { SelectProps }