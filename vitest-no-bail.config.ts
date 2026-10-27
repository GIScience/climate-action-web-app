import { mergeConfig } from 'vitest/config'
import base from './vitest-base.config'

// Full report instead of stopping at the first failure: `pnpm test:no-bail`
export default mergeConfig(base, { test: { bail: 0 } })
