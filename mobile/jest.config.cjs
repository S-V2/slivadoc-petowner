module.exports = {
  preset: "jest-expo",
  modulePaths: ["<rootDir>/node_modules"],
  testMatch: ["<rootDir>/tests/ui/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/ui/setup.ts"],
  maxWorkers: 1,
  cacheDirectory: "<rootDir>/.expo/jest-cache",
};
