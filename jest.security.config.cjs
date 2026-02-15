const path = require("path");

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": path.resolve(__dirname, "jest-preprocessor.js"),
  },
  testMatch: ["<rootDir>/tests/security/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  modulePathIgnorePatterns: ["<rootDir>/.firebase/"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
};
