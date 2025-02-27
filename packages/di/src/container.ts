import { Module } from './module'
import type { Injector, ProviderToken } from './types'

export enum ProvideScope {
  TRANSIENT = 'transient',
  SINGLETON = 'singleton',
}

export class Container extends Module implements Injector {
  private readonly instantiatedSingletonProviders: Map<Symbol, any>

  // Tracks active injecting symbols in order to see if we stumbled upon a circular dependency
  private readonly circularResolutionTrackingContext: Set<Symbol>

  constructor() {
    super()
    this.instantiatedSingletonProviders = new Map()
    this.circularResolutionTrackingContext = new Set()
  }

  async inject<T>(
    token: ProviderToken<T>,
    scope: ProvideScope = ProvideScope.SINGLETON
  ): Promise<T> {
    if (this.circularResolutionTrackingContext.has(token)) {
      throw new Error(
        'Circular dependency on injection of key ' + token.toString()
      )
    }

    this.circularResolutionTrackingContext.add(token)

    if (scope === ProvideScope.SINGLETON) {
      const instantiatedProvider =
        this.instantiatedSingletonProviders.get(token)

      if (instantiatedProvider) {
        return instantiatedProvider
      }
    }

    const factory = this.providers.get(token)

    if (!factory) {
      throw new Error(
        'No factory available for the specified token ' + token.toString()
      )
    }

    const instantiatedProvider = await factory(this)

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedSingletonProviders.set(token, instantiatedProvider)
    }

    this.circularResolutionTrackingContext.delete(token)

    return instantiatedProvider
  }
}

export const createContainer = () => {
  return new Container()
}
