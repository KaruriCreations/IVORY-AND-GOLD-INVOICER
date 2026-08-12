module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", {
      presets: [["@babel/preset-react", { "runtime": "automatic" }]]
    }]
  },
  setupFiles: ["<rootDir>/setupTests.js"]
};