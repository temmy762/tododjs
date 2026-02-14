/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': 'rgb(var(--brand-bg-primary) / <alpha-value>)',
        'dark-surface': 'rgb(var(--brand-bg-dark) / <alpha-value>)',
        'dark-elevated': 'rgb(var(--brand-bg-secondary) / <alpha-value>)',
        'dark-border': 'rgb(var(--brand-text-tertiary) / <alpha-value>)',
        'accent': 'rgb(var(--brand-red) / <alpha-value>)',
        'accent-hover': 'rgb(var(--brand-red-hover) / <alpha-value>)',
        'brand-red': 'rgb(var(--brand-red) / <alpha-value>)',
        'brand-text-primary': 'rgb(var(--brand-text-primary) / <alpha-value>)',
        'brand-text-secondary': 'rgb(var(--brand-text-secondary) / <alpha-value>)',
        'brand-text-tertiary': 'rgb(var(--brand-text-tertiary) / <alpha-value>)',
        'brand-black': 'rgb(var(--brand-bg-secondary) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
