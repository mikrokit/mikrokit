import type { ProviderFactory, ProviderToken } from './types'

export class Module {
  protected providers: Map<Symbol, ProviderFactory<any>>

  constructor(public moduleName?: string) {
    this.providers = new Map()
  }

  provide<T>(token: ProviderToken<T>, factory: ProviderFactory<T>): this {
    if (this.providers.has(token)) {
      throw new Error(
        'Trying to re-inject provider for symbol ' + token.toString()
      )
    }

    this.providers.set(token, factory)

    return this
  }

  import(module: Module): this {
    for (const token of module.providers.keys()) {
      if (this.providers.has(token)) {
        throw new Error(
          'Cannot import module, duplicate token ' + token.toString()
        )
      }

      this.providers.set(token, module.providers.get(token)!)
    }

    return this
  }
}

export const createModule = () => {
  return new Module()
}
