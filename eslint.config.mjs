import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/', '.next/', 'out/', 'dist/'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
