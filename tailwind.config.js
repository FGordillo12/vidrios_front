module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./**/*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        'primary-cyan': '#1CCFD9',
        'primary-blue': '#1C71D9',
        'primary-indigo': '#261CD9',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        dark: { DEFAULT: '#0B0F1A', surface: '#151A2B', border: '#262D45' },
        light: { DEFAULT: '#F4F7FB', surface: '#FFFFFF' }
      },
      borderRadius: { '2xl': '1.25rem' },
      fontFamily: { sans: ['Inter', 'Montserrat', 'ui-sans-serif', 'system-ui'] },
      backgroundImage: { 'brand-gradient': 'linear-gradient(115deg, #1CCFD9, #1C71D9 58%, #261CD9)' }
    }
  },
  plugins: []
};
