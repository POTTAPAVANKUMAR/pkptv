/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: {
          DEFAULT: '#111827',
          hover: '#1f293d',
          card: '#131b2e',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          primary: '#6366f1',    // Indigo
          hover: '#4f46e5',
          glow: 'rgba(99, 102, 241, 0.35)',
          accent: '#ec4899',   // Pink accent
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'player-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
}
