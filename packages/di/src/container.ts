import { Module } from './module.js'
import type {
  GroupProviderToken,
  Injector,
  ProviderToken,
  SingleProviderToken,
  Tokenized,
} from './types.js'

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

  async inject<T>(
    token: ProviderToken<T> | Tokenized<any, T>,
    scope: ProvideScope = ProvideScope.SINGLETON
  ): Promise<T | T[]> {
    const normalizedToken = 'token' in token ? token.token : token

    if (this.injectionStack.includes(normalizedToken)) {
      throw new Error(
        `Provider ${normalizedToken.toString()} is already being instantiated. This error can be caused by either a circular dependency or not awaiting the inject calls`
      )
    }

    if (normalizedToken._.group) {
      const result = await this.injectGroup(
        normalizedToken as GroupProviderToken<T>,
        scope
      )
      return result
    }

    const result = await this.injectSingle(
      normalizedToken as SingleProviderToken<T>,
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
      result.push(await factory(new Container(this, token)))
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
