module.exports = {
  content: ["./src/app/**/*.{ts,tsx,js,jsx}", "./src/components/**/*.{ts,tsx,js,jsx}", "./UI/**/*.html", "./pages/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7fb',
          100: '#ffeef6',
          500: '#f6a6d9'
        },
        accent: '#cdb4ff'
      },
      borderRadius: {
        xl: '1rem'
      }
    }
  },
  plugins: []
}
