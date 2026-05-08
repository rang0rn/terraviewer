import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#f5f5f5',
        ink: '#1a1a1a',
      },
    },
  },
  plugins: [],
}

export default config
