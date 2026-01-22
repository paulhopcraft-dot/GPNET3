import React from 'react';
import { cn } from '../../lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'strong' | 'subtle' | 'gradient';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassPanel({
  children,
  variant = 'default',
  rounded = 'lg',
  shadow = 'md',
  className,
  ...props
}: GlassPanelProps) {
  const variantClasses = {
    default: 'bg-white/10 backdrop-blur-md border border-white/20',
    strong: 'bg-white/15 backdrop-blur-lg border border-white/30',
    subtle: 'bg-white/5 backdrop-blur-sm border border-white/10',
    gradient: 'bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/20'
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-lg shadow-black/5',
    md: 'shadow-xl shadow-black/10',
    lg: 'shadow-2xl shadow-black/20'
  };

  return (
    <div
      className={cn(
        'glass-panel transition-all duration-300',
        variantClasses[variant],
        roundedClasses[rounded],
        shadowClasses[shadow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Test component for verification
export function GlassPanelTest() {
  return (
    <div className="p-8 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 min-h-screen">
      <GlassPanel className="glass-panel-test p-6 max-w-md mx-auto">
        <h2 className="text-white text-xl font-bold mb-4">Glass Panel Test</h2>
        <p className="text-white/90">
          This is a test of the GlassPanel component with glassmorphism effects.
        </p>
      </GlassPanel>
    </div>
  );
}