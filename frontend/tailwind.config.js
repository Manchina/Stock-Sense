import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
    },
  },
  plugins: [
    daisyui,
  ],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#1d4ed8", // Clean classic Blue (Tailwind Blue-700)
          "primary-content": "#ffffff",
          "secondary": "#0f766e", // Teal
          "secondary-content": "#ffffff",
          "accent": "#0284c7", // Sky Blue
          "accent-content": "#ffffff",
          "neutral": "#1e293b", // Slate
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          "info": "#0284c7",
          "success": "#15803d",
          "warning": "#b45309",
          "error": "#b91c1c",
        },
      },
    ],
    darkTheme: false,
  },
}
