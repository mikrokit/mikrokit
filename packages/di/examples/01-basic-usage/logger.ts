/* eslint-disable no-console */
import { defineProvider } from '@mikrokit/di'

export const Logger = defineProvider(() => {
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
