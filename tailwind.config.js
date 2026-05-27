/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      borderRadius: {
        lg: '1rem',
        md: 'calc(1rem - 2px)',
        sm: 'calc(1rem - 4px)',
      },
      colors: {
        background: 'hsl(270 40% 3%)',
        foreground: 'hsl(270 20% 95%)',
        card: 'hsl(270 35% 5%)',
        'card-foreground': 'hsl(270 20% 95%)',
        border: 'hsl(270 25% 15%)',
        input: 'hsl(270 25% 15%)',
        ring: 'hsl(270 80% 65%)',
        primary: {
          DEFAULT: 'hsl(270 80% 65%)',
          foreground: 'hsl(270 40% 3%)',
        },
        secondary: {
          DEFAULT: 'hsl(270 30% 12%)',
          foreground: 'hsl(270 20% 95%)',
        },
        muted: {
          DEFAULT: 'hsl(270 30% 12%)',
          foreground: 'hsl(270 15% 60%)',
        },
        accent: {
          DEFAULT: 'hsl(280 90% 70%)',
          foreground: 'hsl(270 40% 3%)',
        },
        destructive: {
          DEFAULT: 'hsl(320 80% 60%)',
          foreground: 'hsl(270 40% 3%)',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'slowPulse': { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.75', transform: 'scale(0.97)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slow-pulse': 'slowPulse 2s ease-in-out infinite',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
