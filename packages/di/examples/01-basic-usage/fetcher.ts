import { createProviderToken, defineProvider } from '@mikrokit/di'
import { Logger } from './logger'

export const fetcherFactory = defineProvider(async (injector) => {
  const logger = await injector.inject(Logger)

  const fetchAndLogData = async (url: string) => {
    try {
      const response = await fetch(url)
      const data = await response.text()
      logger.info(data)
    } catch (e) {
      logger.error(`${e}`)
    }
  }

  return {
    fetchAndLogData,
  }
})

export const Fetcher = createProviderToken(fetcherFactory)
