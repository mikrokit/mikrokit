export interface Injector {
  inject<T>(token: ProviderToken<T>): Promise<T>
}

export type ProviderToken<T> = Symbol & {
  _provided: T
}

export type ProviderFactory<T> = (injector: Injector) => Promise<T> | T
