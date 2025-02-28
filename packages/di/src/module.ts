import type {
  GroupProviderToken,
  ProviderFactory,
  ProviderToken,
  SingleProviderToken,
} from './types'

export type InternalGroupProviderDefinition = {
  group: true
  factories: ProviderFactory<any>[]
}

export type InternalSingleProviderDefinition = {
  group: false
  factory: ProviderFactory<any>
}

export type InternalProviderDefinition =
  | InternalSingleProviderDefinition
  | InternalGroupProviderDefinition

export class Module {
  protected providers: Map<Symbol, InternalProviderDefinition>

  constructor(public moduleName?: string) {
    this.providers = new Map()
  }

  provide<T>(token: ProviderToken<T>, factory: ProviderFactory<T>): this {
    if (token._.group) {
      this.provideGroupToken(token as GroupProviderToken<T>, factory)
    } else {
      this.provideSingleToken(token as SingleProviderToken<T>, factory)
    }

    return this
  }

  import(module: Module): this {
    for (const token of module.providers.keys()) {
      const ownProvider = this.providers.get(token)
      const importedModuleProvider = module.providers.get(token)!

      if (!ownProvider) {
        this.providers.set(token, importedModuleProvider)
        continue
      }

      if (ownProvider.group && importedModuleProvider.group) {
        ownProvider.factories.push(...importedModuleProvider.factories)
        continue
      }

      if (ownProvider.group && !importedModuleProvider.group) {
        throw new Error(
          `Trying to re-provide group-type provider ${token.toString()} that was already provided as single-type provider`
        )
      }

      throw new Error(
        'Trying to re-provide single-type provider for ' + token.toString()
      )
    }

    return this
  }

  private provideGroupToken<T>(
    token: GroupProviderToken<T>,
    factory: ProviderFactory<T>
  ) {
    const existingProviderDefinition = this.providers.get(token)

    if (
      existingProviderDefinition &&
      existingProviderDefinition.group !== token._.group
    ) {
      throw new Error(
        `Trying to re-provide group-type provider ${token.toString} that was already provided as single-type provider`
      )
    }

    if (existingProviderDefinition) {
      existingProviderDefinition.factories.push(factory)
      return
    }

    const providerDefinition = {
      group: true,
      factories: [factory],
    } satisfies InternalProviderDefinition

    this.providers.set(token, providerDefinition)
  }

  private provideSingleToken<T>(
    token: SingleProviderToken<T>,
    factory: ProviderFactory<T>
  ) {
    if (this.providers.has(token)) {
      const existingProvider = this.providers.get(token)!

      if (existingProvider.group !== token._.group) {
        throw new Error(
          `Trying to re-provide single-type provider ${token.toString()} as group-type provider`
        )
      }

      throw new Error(
        'Trying to re-provide single-type provider for ' + token.toString()
      )
    }

    this.providers.set(token, {
      group: false,
      factory,
    })
  }
}

export const createModule = () => {
  return new Module()
}
