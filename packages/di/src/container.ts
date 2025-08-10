import { Module } from './module.js'
import type {
  GroupProviderToken,
  Injector,
  LazyInjected,
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

  private readonly lazyInjectionsQueue: {
    token: SingleProviderToken<any>
    scope: ProvideScope
    resolve: (value: any) => void
  }[] = []

  private constructor(
    parentContainer?: Container,
    injectionItem?: Symbol,
    injectionStack?: Symbol[]
  ) {
    super(parentContainer?.moduleName, parentContainer?.providers)

    this.instantiatedSingleSingletonProviders =
      parentContainer?.instantiatedSingleSingletonProviders ?? new Map()
    this.instantiatedGroupSingletonProviders =
      parentContainer?.instantiatedGroupSingletonProviders ?? new Map()

    this.injectionStack = injectionItem
      ? [
          ...(injectionStack ?? parentContainer?.injectionStack ?? []),
          injectionItem,
        ]
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

  injectLazy<T>(
    token: SingleProviderToken<T>,
    scope?: ProvideScope
  ): LazyInjected<T> {
    let value: T | undefined

    this.enqueueLazyInjection(token, scope ?? ProvideScope.SINGLETON).then(
      (resolvedProvider) => (value = resolvedProvider)
    )

    return {
      get value(): T {
        if (!value) {
          throw new Error(
            'Lazy provider is not yet resolved. Do not use lazy-injected providers before the provider construction ends.'
          )
        }

        return value
      },
    }
  }

  private async injectSingle<T>(
    token: SingleProviderToken<T>,
    scope: ProvideScope,
    injectionStack?: Symbol[]
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

    const container = new Container(this, token, injectionStack)

    const result = await definition.factory(container)

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedSingleSingletonProviders.set(token, result)
    }

    await container.dequeueLazyInjections()

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
      const container = new Container(this, token)

      result.push(await factory(container))

      await container.dequeueLazyInjections()
    }

    if (scope === ProvideScope.SINGLETON) {
      this.instantiatedGroupSingletonProviders.set(token, result)
    }

    return result
  }

  private enqueueLazyInjection<T>(
    token: SingleProviderToken<T>,
    scope: ProvideScope
  ): Promise<T> {
    return new Promise((resolve) => {
      const resolveLazy = (value: T) => {
        resolve(value)
      }

      this.lazyInjectionsQueue.push({
        token,
        scope,
        resolve: resolveLazy,
      })
    })
  }

  private async dequeueLazyInjections(): Promise<void> {
    for (const lazyInjection of this.lazyInjectionsQueue) {
      try {
        const resolvedValue = await this.injectSingle(
          lazyInjection.token,
          lazyInjection.scope,
          // Exclude the latest token from the stack as it is already resolved
          this.injectionStack.slice(0, -1)
        )
        lazyInjection.resolve(resolvedValue)
      } catch (error) {
        throw new Error(
          `Failed to resolve lazy injection for token ${lazyInjection.token.toString()}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
}

export const createContainer = () => {
  return Container.createEmpty()
}
