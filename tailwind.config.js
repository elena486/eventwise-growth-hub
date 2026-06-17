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
        // ── Eventwise brand design tokens ──
        navy: '#242450',
        'navy-tint': '#F3E8FF',
        'ew-accent': '#8403C5',
        'ew-accent-hover': '#6B02A0',
        'ew-indigo': '#5777AB',
        'ew-success': '#1D9E75',
        'ew-warning': '#E8A020',
        'ew-error': '#DC2626',
        'ew-border': '#EBEBF5',
        'ew-border-strong': '#D8D8EE',
        'ew-muted': '#9CA3AF',
        'ew-muted-light': '#C4C6D4',
        'ew-body': '#1A1A3A',
        'ew-body-light': '#5777AB',
        'ew-bg': '#F6F6FB',
        'ew-footer': '#F6F6FB',
        // Chip colours
        'chip-green-bg': '#E8F7F2',
        'chip-green-text': '#1D9E75',
        'chip-amber-bg': '#FFFBEB',
        'chip-amber-text': '#A16207',
        'chip-red-bg': '#FEF2F2',
        'chip-red-text': '#DC2626',
        'chip-purple-bg': '#F3E8FF',
        'chip-purple-text': '#8403C5',
        'chip-grey-bg': '#EBEBF5',
        'chip-grey-text': '#242450',
        'chip-blue-bg': '#EEF2F8',
        'chip-blue-text': '#5777AB',
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
