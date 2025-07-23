/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'dunggeunmo': ['DungGeunMo', 'monospace'],
        'dos': ['DOSMyungjo', 'serif'],
        'galmuri': ['Galmuri9', 'monospace'],
        'press-start': ['PressStart2P-Regular', 'monospace'],
      },
      colors: {
        'retro-dark': '#1a1b1e',
        'retro-darker': '#0f1012',
        'retro-yellow': '#ffd100',
        'retro-pink': '#ff2674',
        'retro-white': '#ffffff',
        'retro-gray': '#666666',
      },
    },
  },
  plugins: [],
}