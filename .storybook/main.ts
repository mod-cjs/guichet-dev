import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-a11y'],
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen',
  },
}

export default config
