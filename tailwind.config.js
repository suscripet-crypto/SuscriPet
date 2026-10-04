/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: { extend: { colors: { ink: '#183b35', leaf: '#287a65', mint: '#e8f4ee', sand: '#f7f5ef', coral: '#ed8064' }, boxShadow: { soft: '0 18px 55px rgba(24,59,53,.08)' } } },
  plugins: []
};
