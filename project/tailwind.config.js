/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Co-Pilot brand colors (match CSS variables)
        copilot: {
          bg:       '#0a0a0f',
          card:     '#13131f',
          elevated: '#1a1a2e',
          accent:   '#00d4aa',
          warning:  '#f59e0b',
          danger:   '#ef4444',
          success:  '#10b981',
          info:     '#3b82f6',
        },
        // Legacy brand colors (kept for backward compat)
        primary: {
          50:  '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd',
          300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9',
          600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
        },
        secondary: {
          50:  '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe',
          300: '#f0abfc', 400: '#e879f9', 500: '#d946ef',
          600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'copilot-glow':    'radial-gradient(ellipse at top, rgba(0,212,170,0.1) 0%, transparent 60%)',
      },
      animation: {
        'swipe-in':   'swipe-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-up':    'fade-up 0.4s ease forwards',
        'float':      'float 3s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
      },
      borderRadius: {
        'xl2': '18px',
        'xl3': '24px',
      },
    },
  },
  plugins: [],
}