/* eslint-disable no-console */
import { createProviderToken, defineProvider } from '@mikrokit/di'

export const loggerFactory = defineProvider(() => {
  const info = (message: string) => {
    console.log(`[INFO]: ${message}`)
  }

  const error = (message: string) => {
    console.error(`[ERROR]: ${message}`)
  }

  return {
    info,
    error,
  }
})

export const Logger = createProviderToken(loggerFactory)
