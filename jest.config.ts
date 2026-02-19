import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  // Load all adapter modules before tests run
  setupFiles: ["<rootDir>/tests/setup.ts"],
  // Long timeout — mainnet RPCs and TX confirmation can be slow
  testTimeout: 120_000,
  // Run test files sequentially (not parallel) since they share a wallet
  maxWorkers: 1,
  verbose: true,
};

export default config;
