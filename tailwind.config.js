/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./checkout.html",
    "./success.html",
    "./legal.html",
    "./demo-instant-feedback.html",
    "./admin-images.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'hover:border-primary',
    'hover:border-accent-green',
    'hover:border-accent-orange',
    'hover:border-accent-purple',
    'hover:border-accent-red',
    'bg-primary/10',
    'bg-accent-green/10',
    'bg-accent-orange/10',
    'bg-accent-purple/10',
    'bg-accent-red/10',
    'text-primary',
    'text-accent-green',
    'text-accent-orange',
    'text-accent-purple',
    'text-accent-red',
    'border-accent-red',
    'border-accent-green',
    // We add regular expressions to keep any class that starts with these
    { pattern: /border-(primary|accent-green|accent-orange|accent-purple|accent-red)/, variants: ['hover'] },
    { pattern: /bg-(primary|accent-green|accent-orange|accent-purple|accent-red)\/10/ },
    { pattern: /text-(primary|accent-green|accent-orange|accent-purple|accent-red)/ }
  ],
  darkMode: "class",
  theme: {
      extend: {
          colors: {
              "primary": "#11b4d4",
              "accent-green": "#10b981",
              "accent-orange": "#f59e0b",
              "accent-purple": "#8b5cf6",
              "accent-red": "#ef4444",
              "background-light": "#f6f8f8",
              "background-dark": "#101f22",
              "surface-dark": "#1a2e32",
              "border-dark": "#234248",
          },
          fontFamily: {
              "display": ["Space Grotesk", "sans-serif"]
          },
          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
          boxShadow: {
              'depth': '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              'glow-primary': '0 0 15px rgba(17, 180, 212, 0.3)',
          }
      },
  },
  plugins: [],
}