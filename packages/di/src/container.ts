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
  private readonly injectionStack: Symbol[]

  private constructor(parentContainer?: Container, injectionItem?: Symbol) {
    super(parentContainer?.moduleName, parentContainer?.providers)

    this.instantiatedSingleSingletonProviders =
      parentContainer?.instantiatedSingleSingletonProviders ?? new Map()
    this.instantiatedGroupSingletonProviders =
      parentContainer?.instantiatedGroupSingletonProviders ?? new Map()

    this.injectionStack = injectionItem
      ? [...(parentContainer?.injectionStack ?? []), injectionItem]
      : []
  }

  static createEmpty(): Container {
    return new Container()
  }

  // We need those overloads to make sure that the return type is correct
  inject<T>(token: SingleProviderToken<T>, scope?: ProvideScope): Promise<T>
  inject<T>(token: GroupProviderToken<T>, scope?: ProvideScope): Promise<T[]>

  async inject<T>(
    token: ProviderToken<T>,
    scope: ProvideScope = ProvideScope.SINGLETON
  ): Promise<T | T[]> {
    if (this.injectionStack.includes(token)) {
      throw new Error(
        `Provider ${token.toString()} is already being instantiated. This error can be caused by either a circular dependency or not awaiting the inject calls`
      )
    }

    if (token._.group) {
      const result = await this.injectGroup(
        token as GroupProviderToken<T>,
        scope
      )
      return result
    }

    const result = await this.injectSingle(
      token as SingleProviderToken<T>,
      scope
    )
    return result
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

    const result = await definition.factory(new Container(this, token))

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
  return Container.createEmpty()
}
