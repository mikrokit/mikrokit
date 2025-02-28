import { describe, expect, it } from 'vitest'

import {
  createModule,
  createProviderToken,
  defineStaticProvider,
  Module,
} from '../src'
import { createGroupProviderToken } from '../src/helpers'

// Test helper class that extends Module to expose protected properties for testing
class TestModule extends Module {
  getProviders() {
    return this.providers
  }
}

// Factory function for test module
const createTestModule = () => new TestModule()

describe('Module', () => {
  it('createModule should be a function', () => {
    expect(typeof createModule).toBe('function')
  })

  it('should return a Module instance on call to createModule', () => {
    const createdModule = createModule()

    expect(createdModule).toBeInstanceOf(Module)
  })

  it('should return a Module instance after call to .provide', () => {
    const module = createModule()

    const emptyProviderFactory = defineStaticProvider({})
    const EmptyProvider = createProviderToken(emptyProviderFactory)

    const returnValue = module.provide(EmptyProvider, emptyProviderFactory)

    expect(returnValue).toBeInstanceOf(Module)
  })

  it('should allow providing a provider with a token', () => {
    const staticValue = { test: 'value' }
    const providerFactory = defineStaticProvider(staticValue)
    const Provider = createProviderToken(providerFactory)

    const module = createTestModule()
    module.provide(Provider, providerFactory)

    // Verify the provider is stored in the module's providers map
    const providers = module.getProviders()
    expect(providers.has(Provider)).toBe(true)
    expect(providers.get(Provider)).toStrictEqual({
      factory: providerFactory,
      group: false,
    })
  })

  it('should throw when trying to re-provide the same token', () => {
    const staticValue = { test: 'value' }
    const providerFactory = defineStaticProvider(staticValue)
    const Provider = createProviderToken(providerFactory)

    const module = createModule()
    module.provide(Provider, providerFactory)

    expect(() => {
      module.provide(Provider, providerFactory)
    }).toThrowError('Trying to re-provide single-type provider for Symbol()')
  })

  it('should allow creating a module with a name', () => {
    const moduleName = 'TestModule'
    const module = new Module(moduleName)

    expect(module.moduleName).toBe(moduleName)
  })

  describe('import', () => {
    it('should import providers from another module', () => {
      const provider1Factory = defineStaticProvider('test1')
      const Provider1 = createProviderToken(provider1Factory, 'provider1')

      const provider2Factory = defineStaticProvider('test2')
      const Provider2 = createProviderToken(provider2Factory, 'provider2')

      const module1 = createTestModule().provide(Provider1, provider1Factory)
      const module2 = createTestModule().provide(Provider2, provider2Factory)

      // Import module2 into module1
      module1.import(module2)

      // Verify both providers are in module1
      const providers = module1.getProviders()
      expect(providers.has(Provider1)).toBe(true)
      expect(providers.has(Provider2)).toBe(true)
      expect(providers.get(Provider1)).toStrictEqual({
        factory: provider1Factory,
        group: false,
      })
      expect(providers.get(Provider2)).toStrictEqual({
        factory: provider2Factory,
        group: false,
      })
    })

    it('should return the module instance after importing', () => {
      const module1 = createModule()
      const module2 = createModule()

      const returnValue = module1.import(module2)

      expect(returnValue).toBe(module1)
    })

    it('should throw when importing a module with a duplicate token', () => {
      const providerFactory = defineStaticProvider('test')
      const Provider = createProviderToken(providerFactory, 'provider')

      const module1 = createModule().provide(Provider, providerFactory)
      const module2 = createModule().provide(Provider, providerFactory)

      expect(() => {
        module1.import(module2)
      }).toThrowError(
        'Trying to re-provide single-type provider for Symbol(provider)'
      )
    })

    it('should import multiple providers from another module', () => {
      const provider1Factory = defineStaticProvider('test1')
      const Provider1 = createProviderToken(provider1Factory, 'provider1')

      const provider2Factory = defineStaticProvider('test2')
      const Provider2 = createProviderToken(provider2Factory, 'provider2')

      const provider3Factory = defineStaticProvider('test3')
      const Provider3 = createProviderToken(provider3Factory, 'provider3')

      const moduleA = createTestModule()
        .provide(Provider1, provider1Factory)
        .provide(Provider2, provider2Factory)

      const moduleB = createTestModule().provide(Provider3, provider3Factory)

      moduleB.import(moduleA)

      const providers = moduleB.getProviders()
      expect(providers.has(Provider1)).toBe(true)
      expect(providers.has(Provider2)).toBe(true)
      expect(providers.has(Provider3)).toBe(true)
    })

    it('should support chaining multiple imports', () => {
      const provider1Factory = defineStaticProvider('test1')
      const Provider1 = createProviderToken(provider1Factory, 'provider1')

      const provider2Factory = defineStaticProvider('test2')
      const Provider2 = createProviderToken(provider2Factory, 'provider2')

      const provider3Factory = defineStaticProvider('test3')
      const Provider3 = createProviderToken(provider3Factory, 'provider3')

      const module1 = createTestModule().provide(Provider1, provider1Factory)
      const module2 = createTestModule().provide(Provider2, provider2Factory)
      const module3 = createTestModule().provide(Provider3, provider3Factory)

      const mainModule = createTestModule()
        .import(module1)
        .import(module2)
        .import(module3)

      const providers = mainModule.getProviders()
      expect(providers.has(Provider1)).toBe(true)
      expect(providers.has(Provider2)).toBe(true)
      expect(providers.has(Provider3)).toBe(true)
    })
  })

  describe('black box', () => {
    // These tests don't access internal state at all

    it('should allow providing and then throw when providing duplicate token', () => {
      const Provider = createProviderToken<string>(undefined, 'uniqueToken')
      const providerFactory = defineStaticProvider('test value')

      const module = createModule()

      // First provide should work
      expect(() => {
        module.provide(Provider, providerFactory)
      }).not.toThrow()

      // Second provide with same token should throw
      expect(() => {
        module.provide(Provider, providerFactory)
      }).toThrowError(
        'Trying to re-provide single-type provider for Symbol(uniqueToken)'
      )
    })

    it('should throw when importing modules with duplicate tokens', () => {
      const Provider = createProviderToken<string>(undefined, 'duplicateToken')
      const providerFactory = defineStaticProvider('test value')

      const moduleA = createModule().provide(Provider, providerFactory)
      const moduleB = createModule().provide(Provider, providerFactory)

      expect(() => {
        moduleA.import(moduleB)
      }).toThrowError(
        'Trying to re-provide single-type provider for Symbol(duplicateToken)'
      )
    })

    it('should support method chaining for provide and import', () => {
      const Provider1 = createProviderToken<string>(undefined, 'token1')
      const Provider2 = createProviderToken<string>(undefined, 'token2')
      const Provider3 = createProviderToken<string>(undefined, 'token3')

      const module1 = createModule().provide(
        Provider3,
        defineStaticProvider('test3')
      )

      // Test chaining
      const module = createModule()
        .provide(Provider1, defineStaticProvider('test1'))
        .provide(Provider2, defineStaticProvider('test2'))
        .import(module1)

      // No need to check internals, just verify it didn't throw
      expect(module).toBeInstanceOf(Module)
    })

    it('should throw if trying to re-provide group-type provider as single-type one', () => {
      const token = createGroupProviderToken<string>()

      const module = createModule()

      module.provide(token, defineStaticProvider('test-1'))

      // @ts-expect-error - testing private property change
      token._.group = false

      expect(() =>
        module.provide(token, defineStaticProvider('test-2'))
      ).toThrowError(
        'Trying to re-provide single-type provider Symbol() as group-type provider'
      )
    })

    it('should throw if trying to re-provide single-type provider as group-type one', () => {
      const token = createProviderToken<string>()

      const module = createModule()

      module.provide(token, defineStaticProvider('test-1'))

      // @ts-expect-error - testing private property change
      token._.group = true

      expect(() =>
        module.provide(token, defineStaticProvider('test-2'))
      ).toThrow()
    })

    it('should merge group-type providers when importing', () => {
      const token = createGroupProviderToken<string>()

      const module1 = createTestModule()
      const module2 = createModule()

      const provider1 = defineStaticProvider('test1')
      const provider2 = defineStaticProvider('test2')

      module1.provide(token, provider1)
      module2.provide(token, provider2)

      module1.import(module2)

      expect(module1.getProviders().get(token)).toStrictEqual({
        group: true,
        factories: [provider1, provider2],
      })
    })

    it('should throw on import if same symbol modules have different types in different modules', () => {
      const token = createGroupProviderToken<string>()

      const module1 = createTestModule()
      const module2 = createModule()

      const provider1 = defineStaticProvider('test1')
      const provider2 = defineStaticProvider('test2')

      module1.provide(token, provider1)

      // @ts-expect-error - testing private property change
      token._.group = false

      module2.provide(token, provider2)

      expect(() => module1.import(module2)).toThrowError(
        'Trying to re-provide group-type provider Symbol() that was already provided as single-type provider'
      )
    })
  })
})
