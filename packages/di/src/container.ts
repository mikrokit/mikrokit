import { Module } from './module'
import type {
  GroupProviderToken,
  Injector,
  ProviderToken,
  SingleProviderToken,
} from './types'

export enum ProvideScope {
  TRANSIENT = 'transient',
  SINGLETON = 'singleton',
}

export class Container extends Module implements Injector {
  private readonly instantiatedSingleSingletonProviders: Map<Symbol, any>
  private readonly instantiatedGroupSingletonProviders: Map<Symbol, any[]>

  // Tracks active injecting symbols in order to see if we stumbled upon a circular dependency
  private readonly currentInstantiationTrackingContext: Set<Symbol>

  constructor() {
    super()

    this.instantiatedSingleSingletonProviders = new Map()
    this.instantiatedGroupSingletonProviders = new Map()

    this.currentInstantiationTrackingContext = new Set()
  }

  // We need those overloads to make sure that the return type is correct
  inject<T>(token: SingleProviderToken<T>, scope?: ProvideScope): Promise<T>
  inject<T>(token: GroupProviderToken<T>, scope?: ProvideScope): Promise<T[]>

  async inject<T>(
    token: ProviderToken<T>,
    scope: ProvideScope = ProvideScope.SINGLETON
  ): Promise<T | T[]> {
    if (this.currentInstantiationTrackingContext.has(token)) {
      throw new Error(
        `Provider ${token.toString()} is already being instantiated. This error can be caused by either a circular dependency or not awaiting the inject calls`
      )
    }

    this.currentInstantiationTrackingContext.add(token)

    try {
      if (token._.group) {
        const result = await this.injectGroup(
          token as GroupProviderToken<T>,
          scope
        )
        this.currentInstantiationTrackingContext.delete(token)
        return result
      }

      const result = await this.injectSingle(
        token as SingleProviderToken<T>,
        scope
      )
      this.currentInstantiationTrackingContext.delete(token)
      return result
    } catch (e) {
      this.currentInstantiationTrackingContext.delete(token)
      throw e
    }
  }

  private async injectSingle<T>(
    token: SingleProviderToken<T>,
    scope: ProvideScope
  ): Promise<T> {
    if (scope === ProvideScope.SINGLETON) {
      const instantiatedProvider =
        this.instantiatedSingleSingletonProviders.get(token)

      if (instantiatedProvider) {
        return instantiatedProvider
      }
    }

    const definition = this.providers.get(token)

    if (!definition) {
      throw new Error(
        'No factory available for the specified token ' + token.toString()
      )
    }

    if (token._.group !== definition.group) {
      throw new Error(
        `Trying to inject group-type provider ${token.toString()} as single-type provider`
      )
    }

    const result = await definition.factory(this)

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedSingleSingletonProviders.set(token, result)
    }

    return result
  }

  private async injectGroup<T>(
    token: GroupProviderToken<T>,
    scope: ProvideScope
  ): Promise<T[]> {
    if (scope === ProvideScope.SINGLETON) {
      const instantiatedProviders =
        this.instantiatedGroupSingletonProviders.get(token)

      if (instantiatedProviders) {
        return instantiatedProviders
      }
    }

    const definition = this.providers.get(token)

    if (!definition) {
      return []
    }

    if (token._.group !== definition.group) {
      throw new Error(
        `Trying to inject single-type provider ${token.toString()} as group-type provider`
      )
    }

    const result: T[] = []
    for (const factory of definition.factories) {
      result.push(await factory(this))
    }

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedGroupSingletonProviders.set(token, result)
    }

    return result
  }
}

export const createContainer = () => {
  return new Container()
}
