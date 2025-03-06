import type {
  GroupProviderToken,
  ProviderFactory,
  ProviderToken,
  SingleProviderToken,
  TokenizedProviderFactory,
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

export const defineProviderFactory = <T>(
  factory: ProviderFactory<T>
): ProviderFactory<T> => factory

export const defineStaticProviderFactory =
  <T>(staticValue: T): ProviderFactory<T> =>
  () =>
    staticValue

export const attachProviderToken = <T, TToken extends ProviderToken<T>>(
  factory: ProviderFactory<T>,
  token: TToken
): TokenizedProviderFactory<T, TToken> => {
  return Object.assign(factory, {
    token,
  })
}

export function defineStaticProvider<T>(
  value: T
): TokenizedProviderFactory<T, SingleProviderToken<T>>

export function defineStaticProvider<T, TToken extends ProviderToken<T>>(
  value: T,
  token: TToken
): TokenizedProviderFactory<T, TToken>

export function defineStaticProvider<T, TToken extends ProviderToken<T>>(
  staticValue: T,
  token?: TToken
) {
  return defineProvider(defineStaticProviderFactory(staticValue), token as any)
}

export function defineProvider<T>(
  factory: ProviderFactory<T>,
  name?: string
): TokenizedProviderFactory<T, SingleProviderToken<T>>

export function defineProvider<T, TToken extends ProviderToken<T>>(
  factory: ProviderFactory<T>,
  token: TToken
): TokenizedProviderFactory<T, TToken>

export function defineProvider<T, TToken extends ProviderToken<T>>(
  factory: ProviderFactory<T>,
  tokenOrName?: TToken | string
): TokenizedProviderFactory<T, TToken> {
  const token =
    typeof tokenOrName === 'string' || !tokenOrName
      ? createProviderToken(factory, tokenOrName)
      : tokenOrName

  return Object.assign(factory, {
    token,
  }) as TokenizedProviderFactory<T, TToken>
}
