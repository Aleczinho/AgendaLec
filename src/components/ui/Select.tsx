import { cn } from '@/lib/utils'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps extends React.HTMLAttributes<HTMLSelectElement> {
  options: Option[]
  value?: string | number
  onSelect?: (value: string | number) => void
  placeholder?: string
  searchable?: boolean
  error?: string
  size?: 'sm' | 'md'
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(props => {
  const {
    options,
    value,
    onSelect,
    placeholder,
    searchable = false,
    error,
    className,
    ...attrs
  } = props

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value
    if (onSelect) onSelect(selectedValue)
  }

  const renderedOptions = options.map(option => {
    const isDisabled = option.disabled
    return (
      <option
        key={option.value}
        value={option.value.toString()}
        disabled={isDisabled}
        selected={option.value === value}
      >
        {option.label}
      </option>
    )
  })

  return (
    <div className="space-y-1">
      <select
        {...attrs}
        className={cn(
          'select',
          searchable && 'pr-8', // space for search icon
          error && 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
          className,
        )}
        onChange={handleChange}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {renderedOptions}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export { Select, SelectProps }