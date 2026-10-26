/** @type {import('postcss-load-config').Config} */
// PostCSS runs Tailwind and autoprefixer when the CSS is built.
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
