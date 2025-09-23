/** @type {import("tailwindcss").Config} */
module.exports = {
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  // In v4, don't register @tailwindcss/typography here — it's loaded via @plugin in CSS
};
