/**
 * Tailwind configuration for dashboard — enforce clean, neutral palette
 */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC', // Slate-50 (Neutral background)
        surface: '#FFFFFF',    // Pure White
        primary: '#0F172A',    // Slate-900 (Text)
        secondary: '#64748B',  // Slate-500 (Muted Text)
        border: '#E2E8F0',     // Slate-200 (Lines)
      }
    }
  },
  plugins: [],
};
