import tailwindcss from "eslint-plugin-tailwindcss";

const config = [
  tailwindcss.configs["flat/recommended"],
  {
    rules: {
      "tailwindcss/no-contradicting-classname": "error",
    },
  },
];

export default config;
