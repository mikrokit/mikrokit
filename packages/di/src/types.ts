import type { ProvideScope } from './container'

export interface Injector {
  inject<T>(token: SingleProviderToken<T>, scope?: ProvideScope): Promise<T>
  inject<T>(token: GroupProviderToken<T>, scope?: ProvideScope): Promise<T[]>

  inject<TOriginalTokenized, T>(
    tokenized: Tokenized<TOriginalTokenized, T, SingleProviderToken<T>>,
    scope?: ProvideScope
  ): Promise<T>

  inject<TOriginalTokenized, T>(
    tokenized: Tokenized<TOriginalTokenized, T, GroupProviderToken<T>>,
    scope?: ProvideScope
  ): Promise<T[]>
}

export type SingleProviderToken<T> = Symbol & {
  _: {
    // This would exist only on type-level
    provided: T

    // This would exist in the actual object
    group: false
  }
}

export type GroupProviderToken<T> = Symbol & {
  _: {
    provided: T

    // This would exist in the actual object
    group: true
  }
}

export type ProviderToken<T> = SingleProviderToken<T> | GroupProviderToken<T>

export type Tokenized<
  TOriginal,
  TProvider,
  TToken extends ProviderToken<TProvider> = ProviderToken<TProvider>,
> = TOriginal & {
  token: TToken
}

export type TokenizedProviderFactory<
  T,
  TToken extends ProviderToken<T>,
> = Tokenized<ProviderFactory<T>, T, TToken>

export type ProviderFactory<T> = (injector: Injector) => Promise<T> | T
