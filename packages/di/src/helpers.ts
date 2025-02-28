import type {
  GroupProviderToken,
  ProviderFactory,
  ProviderToken,
  SingleProviderToken,
} from './types'

export const createProviderToken = <T>(
  _factory?: ProviderFactory<T>,
  name?: string
): SingleProviderToken<T> => {
  const symbol = Symbol(name)

  const metadata: ProviderToken<T>['_'] = {
    provided: undefined as any,
    group: false,
  }

  return Object.assign(symbol, { _: metadata })
}

export const createGroupProviderToken = <T>(
  name?: string
): GroupProviderToken<T> => {
  const symbol = Symbol(name)

  const metadata: ProviderToken<T>['_'] = {
    provided: undefined as any,
    group: true,
  }

  return Object.assign(symbol, { _: metadata })
}

export const defineProvider = <T>(
  factory: ProviderFactory<T>
): ProviderFactory<T> => factory
export const defineStaticProvider =
  <T>(staticValue: T): ProviderFactory<T> =>
  () =>
    staticValue
