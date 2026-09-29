import type { FullConfig } from '@playwright/test'
import { warmDevServer } from './helpers/warm-dev-server'

export default async function globalSetup(config: FullConfig) {
    await warmDevServer(config)
}
