import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Le client Redis (ioredis) et le pool Prisma laissent des handles ouverts
  // après la suite ; sans forceExit, le process Jest ne rend pas la main et le
  // job CI tourne jusqu'au hard-limit (6 h) avant d'être annulé.
  forceExit: true,
  // GUIC-538 — plafonne la parallélisation. À pleine parallélisation (~1 worker
  // par cœur), les tests jsdom async (userEvent, countdown) sont affamés en CPU
  // et échouent par intermittence (l'échec « saute » d'une suite à l'autre). La
  // CI ubuntu (2-4 cœurs) n'est pas touchée ; ce cap protège les runs locaux
  // multi-cœurs (pre-push) sans coût CI notable.
  maxWorkers: '50%',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    'src/components/**/*.tsx',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
}

export default createJestConfig(config)
