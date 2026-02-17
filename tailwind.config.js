
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        morning: {
          light: '#fffbeb',
          accent: '#f59e0b',
          text: '#92400e',
        },
        afternoon: {
          light: '#f0f9ff',
          accent: '#0ea5e9',
          text: '#075985',
        },
        evening: {
          light: '#f5f3ff',
          accent: '#8b5cf6',
          text: '#5b21b6',
        }
      },
      boxShadow: {
        'medical-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'medical-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'pulse-bg': 'pulse-bg 4s ease-in-out infinite',
        'ripple': 'ripple 2.5s cubic-bezier(0.23, 1, 0.32, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        'pulse-bg': {
          '0%, 100%': { backgroundColor: 'rgba(14, 165, 233, 0.05)' },
          '50%': { backgroundColor: 'rgba(14, 165, 233, 0.15)' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        }
      }
    }
  },
  plugins: [],
}
