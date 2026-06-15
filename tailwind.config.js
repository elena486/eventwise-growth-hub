/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        dm: ['var(--font-dm)']
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        // Design system tokens
        navy: '#0F0F1A',
        'navy-tint': '#F5F3FF',
        'ew-accent': '#7C3AED',
        'ew-accent-hover': '#6D28D9',
        'ew-indigo': '#4F46E5',
        'ew-success': '#059669',
        'ew-warning': '#D97706',
        'ew-error': '#DC2626',
        'ew-border': '#F0F0F0',
        'ew-border-strong': '#E5E7EB',
        'ew-muted': '#9CA3AF',
        'ew-muted-light': '#D1D5DB',
        'ew-body': '#374151',
        'ew-body-light': '#6B7280',
        'ew-bg': '#FAFAFA',
        'ew-footer': '#FAFAFA',
        // Chip colours
        'chip-green-bg': '#ECFDF5',
        'chip-green-text': '#059669',
        'chip-amber-bg': '#FFFBEB',
        'chip-amber-text': '#D97706',
        'chip-red-bg': '#FEF2F2',
        'chip-red-text': '#DC2626',
        'chip-purple-bg': '#F5F3FF',
        'chip-purple-text': '#7C3AED',
        'chip-grey-bg': '#F3F4F6',
        'chip-grey-text': '#6B7280',
        'chip-blue-bg': '#EEF2FF',
        'chip-blue-text': '#4F46E5',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
