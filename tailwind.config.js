/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        snow: '#f4f1ea',
        ink: '#0b0a09',
        night: '#07080b',
        saffron: '#e7a43c',
        ember: '#c7642a',
        maroon: '#6e1f1a',
        sky: { deep: '#0a2246', DEFAULT: '#1d4f91', haze: '#a9c6e3' },
        flag: { blue: '#2f5ea6', white: '#ebe5d5', red: '#b9352b', green: '#2e7d52', yellow: '#e3b233' },
      },
      maxWidth: { page: '88rem' },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
}
