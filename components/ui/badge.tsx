import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "secondary" | "destructive" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
  
  const variantClasses = {
    default: "border-transparent bg-orange-500 text-white hover:bg-orange-600",
    secondary: "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  )
} 