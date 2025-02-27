import { Module } from './module'
import type { Injector, ProviderToken } from './types'

export enum ProvideScope {
  TRANSIENT = 'transient',
  SINGLETON = 'singleton',
}

export class Container extends Module implements Injector {
  private readonly instantiatedSingletonProviders: Map<Symbol, any>

  // Tracks active injecting symbols in order to see if we stumbled upon a circular dependency
  private readonly currentInstantiationTrackingContext: Set<Symbol>

  constructor() {
    super()
    this.instantiatedSingletonProviders = new Map()
    this.currentInstantiationTrackingContext = new Set()
  }

  async inject<T>(
    token: ProviderToken<T>,
    scope: ProvideScope = ProvideScope.SINGLETON
  ): Promise<T> {
    if (this.currentInstantiationTrackingContext.has(token)) {
      throw new Error(
        `Provider ${token.toString()} is already being instantiated. It can be caused by either a circular dependency or not awaiting the inject calls`
      )
    }

    this.currentInstantiationTrackingContext.add(token)

    if (scope === ProvideScope.SINGLETON) {
      const instantiatedProvider =
        this.instantiatedSingletonProviders.get(token)

      if (instantiatedProvider) {
        this.currentInstantiationTrackingContext.delete(token)
        return instantiatedProvider
      }
    }

    const factory = this.providers.get(token)

    if (!factory) {
      this.currentInstantiationTrackingContext.delete(token)
      throw new Error(
        'No factory available for the specified token ' + token.toString()
      )
    }

    const instantiatedProvider = await factory(this)

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedSingletonProviders.set(token, instantiatedProvider)
    }

    this.currentInstantiationTrackingContext.delete(token)

    return instantiatedProvider
  }
}

export const createContainer = () => {
  return new Container()
}
