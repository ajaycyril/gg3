import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled,
  children,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-[hsl(var(--ring))]",
        // Variants - using standard Tailwind colors
        {
          'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-95': variant === 'primary',
          'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:brightness-95': variant === 'secondary',
          'border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] text-gray-900': variant === 'outline',
          'hover:bg-[hsl(var(--muted))] text-gray-900': variant === 'ghost',
        },
        // Sizes
        {
          'h-9 px-3 text-sm': size === 'sm',
          'h-10 px-4 py-2': size === 'md',
          'h-11 px-8 text-lg': size === 'lg',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
