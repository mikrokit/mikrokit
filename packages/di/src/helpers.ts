import type { ProviderFactory, ProviderToken } from './types'

export const createProviderToken = <T>(
  _factory?: ProviderFactory<T>,
  providerName?: string
): ProviderToken<T> => Symbol(providerName) as unknown as ProviderToken<T>

export const defineProvider = <T>(
  factory: ProviderFactory<T>
): ProviderFactory<T> => factory
export const defineStaticProvider =
  <T>(staticValue: T): ProviderFactory<T> =>
  () =>
    staticValue
