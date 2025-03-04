import {
  createContainer,
  createProviderToken,
  defineProvider,
  defineStaticProvider,
  type Injector,
  Container,
  ProvideScope,
} from '../src'
import { describe, expect, it, vitest } from 'vitest'
import { createGroupProviderToken, defineProviderFactory } from '../src/helpers'

describe('Container', () => {
  it('createContainer should be a function', () => {
    expect(typeof createContainer).toBe('function')
  })

  it('should return a Container instance on call to createContainer', () => {
    const createdContainer = createContainer()

    expect(createdContainer).toBeInstanceOf(Container)
  })

  it('should return a Container instance after call to .provide', () => {
    const container = createContainer()

    const emptyProviderFactory = defineStaticProvider({})
    const EmptyProvider = createProviderToken(emptyProviderFactory)

    const returnValue = container.provide(EmptyProvider, emptyProviderFactory)

    expect(returnValue).toBeInstanceOf(Container)
  })

  it('should not throw on simoultaneous injection of multiple providers', () => {
    const provider1 = defineStaticProvider('test-1')

    const container = createContainer().provide(provider1)

    expect(
      Promise.all([
        container.inject(provider1),
        container.inject(provider1),
        container.inject(provider1),
        container.inject(provider1),
      ])
    ).resolves.toStrictEqual(['test-1', 'test-1', 'test-1', 'test-1'])
  })

  describe('single-type providers', () => {
    it('should return static provider value if it was provided before', async () => {
      const staticValue = {}

      const emptyProviderFactory = defineStaticProvider(staticValue)
      const EmptyProvider = createProviderToken(emptyProviderFactory)

      const container = createContainer().provide(
        EmptyProvider,
        emptyProviderFactory
      )

      const value = await container.inject(EmptyProvider)

      expect(value).toBe(staticValue)
    })

    it('should throw if trying to inject value that was not provided before', () => {
      const NonExistingProvider = createProviderToken<{}>(
        undefined,
        'NonExistingProvider'
      )

      const container = createContainer()

      expect(() => container.inject(NonExistingProvider)).rejects.toThrowError()
    })

    it('should not call provider constructor before it is injected', () => {
      const providerFactory = vitest.fn(() => {
        return 'shit'
      })
      const Provider = createProviderToken(providerFactory)

      createContainer().provide(Provider, providerFactory)

      expect(providerFactory).not.toBeCalled()
    })

    it('should call provider constructor once when injecting it for the first time in singleton scope', async () => {
      const providerFactory = vitest.fn(() => {
        return 'test'
      })
      const Provider = createProviderToken(providerFactory)

      const container = createContainer().provide(Provider, providerFactory)

      expect(providerFactory).not.toBeCalled()

      const injectedProvider = await container.inject(
        Provider,
        ProvideScope.SINGLETON
      )

      expect(providerFactory).toBeCalledTimes(1)
      expect(injectedProvider).toBe('test')
    })

    it('should call provider constructor only once when injecting it multiple times in singleton scope', async () => {
      const providerFactory = vitest.fn(() => {
        return 'test'
      })
      const Provider = createProviderToken(providerFactory)

      const container = createContainer().provide(Provider, providerFactory)

      expect(providerFactory).not.toBeCalled()

      const injectedProvider = await container.inject(
        Provider,
        ProvideScope.SINGLETON
      )
      await container.inject(Provider, ProvideScope.SINGLETON)
      await container.inject(Provider, ProvideScope.SINGLETON)

      expect(providerFactory).toBeCalledTimes(1)
      expect(injectedProvider).toBe('test')
    })

    it('should call provider constructor every time when injecting it in transient scope', async () => {
      const providerFactory = vitest.fn(() => {
        return 'test'
      })
      const Provider = createProviderToken(providerFactory)

      const container = createContainer().provide(Provider, providerFactory)

      expect(providerFactory).not.toBeCalled()

      const injectedProvider = await container.inject(
        Provider,
        ProvideScope.TRANSIENT
      )
      await container.inject(Provider, ProvideScope.TRANSIENT)
      await container.inject(Provider, ProvideScope.TRANSIENT)

      expect(providerFactory).toBeCalledTimes(3)
      expect(injectedProvider).toBe('test')
    })

    it('should call provider constructor another time for transient scope if it has already been injected as a singleton', async () => {
      const providerFactory = vitest.fn(() => {
        return 'test'
      })
      const Provider = createProviderToken(providerFactory)

      const container = createContainer().provide(Provider, providerFactory)

      expect(providerFactory).not.toBeCalled()

      const injectedProvider = await container.inject(
        Provider,
        ProvideScope.SINGLETON
      )
      await container.inject(Provider, ProvideScope.TRANSIENT)
      await container.inject(Provider, ProvideScope.SINGLETON)

      expect(providerFactory).toBeCalledTimes(2)
      expect(injectedProvider).toBe('test')
    })

    it('should return empty array if no providers were provided before', async () => {
      const token = createGroupProviderToken<string>()

      const container = createContainer()

      const result = await container.inject(token)

      expect(result).toStrictEqual([])
    })

    it('should instantiate deep providers only one time if all of them are injected in singleton scope', async () => {
      const provider1Factory = vitest.fn(() => {
        return 'test1'
      })
      const Provider1 = createProviderToken(provider1Factory, 'provider1')

      const provider2Factory = vitest.fn(async (injector: Injector) => {
        const provider1 = await injector.inject(Provider1)

        return 'test_2' + provider1
      })
      const Provider2 = createProviderToken(provider2Factory, 'provider2')

      const provider3Factory = vitest.fn(async (injector: Injector) => {
        const provider1 = await injector.inject(Provider1)

        return 'test_3' + provider1
      })
      const Provider3 = createProviderToken(provider3Factory, 'provider3')

      const container = createContainer()
        .provide(Provider1, provider1Factory)
        .provide(Provider2, provider2Factory)
        .provide(Provider3, provider3Factory)

      await container.inject(Provider1, ProvideScope.SINGLETON)
      await container.inject(Provider2, ProvideScope.SINGLETON)
      await container.inject(Provider3, ProvideScope.SINGLETON)

      expect(provider1Factory).toBeCalledTimes(1)
      expect(provider2Factory).toBeCalledTimes(1)
      expect(provider3Factory).toBeCalledTimes(1)
    })

    it('should throw if trying to inject group-type provider as single-type one', () => {
      const token = createGroupProviderToken<string>()

      const container = createContainer()

      container.provide(token, defineStaticProvider('test-1'))

      // @ts-expect-error - testing private property change
      token._.group = false

      expect(() => container.inject(token)).rejects.toThrowError(
        'Trying to inject group-type provider Symbol() as single-type provider'
      )
    })

    it('should throw on circular dependency with single-type token', () => {
      const CircularToken = createProviderToken<string>()
      const circularDependencyProvider = defineProvider(async (injector) => {
        await injector.inject(CircularToken)

        return 'hello'
      })

      const container = createContainer().provide(
        CircularToken,
        circularDependencyProvider
      )

      expect(() => container.inject(CircularToken)).rejects.toThrowError()
    })

    it('should inject by tokenizable.token', async () => {
      const provider = defineProvider(() => {
        return 'test'
      })

      const container = createContainer().provide(provider)

      const injected = await container.inject(provider)
      expect(injected).toBe('test')
    })

    it('should inject overriden version by tokenizable.token', async () => {
      const provider = defineProvider(() => {
        return 'test'
      })

      const overrideProvider = defineProviderFactory(() => 'test-2')

      const container = createContainer().provide(provider, overrideProvider)

      const injected = await container.inject(provider)

      expect(injected).toBe('test-2')
    })
  })

  describe('group-type providers', () => {
    it('should return array of one value if one group provider was provided before', async () => {
      const token = createGroupProviderToken<string>()

      const value = defineStaticProvider('test')

      const container = createContainer().provide(token, value)

      const result = await container.inject(token)

      expect(result).toStrictEqual(['test'])
    })

    it('should return array of multiple values if multiple group providers were provided before', async () => {
      const token = createGroupProviderToken<string>()

      const provider1 = defineStaticProvider('test-1')
      const provider2 = defineStaticProvider('test-2')
      const provider3 = defineStaticProvider('test-3')

      const container = createContainer()
        .provide(token, provider1)
        .provide(token, provider2)
        .provide(token, provider3)

      const result = await container.inject(token)

      // All elements are here
      expect(result).toStrictEqual(['test-1', 'test-2', 'test-3'])
    })

    it('should call group factories only once when injecting them in singleton scope', async () => {
      const token = createGroupProviderToken<string>()

      const provider1 = defineProvider(vitest.fn(() => 'test-1'))
      const provider2 = defineProvider(vitest.fn(() => 'test-2'))
      const provider3 = defineProvider(vitest.fn(() => 'test-3'))

      const container = createContainer()
        .provide(token, provider1)
        .provide(token, provider2)
        .provide(token, provider3)

      const result1 = await container.inject(token)
      const result2 = await container.inject(token)
      const result3 = await container.inject(token)

      expect(provider1).toBeCalledTimes(1)
      expect(provider2).toBeCalledTimes(1)
      expect(provider3).toBeCalledTimes(1)

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    })

    it('should call group factories every time when injecting them in transient scope', async () => {
      const token = createGroupProviderToken<string>()

      const provider1 = defineProvider(vitest.fn(() => 'test-1'))
      const provider2 = defineProvider(vitest.fn(() => 'test-2'))
      const provider3 = defineProvider(vitest.fn(() => 'test-3'))

      const container = createContainer()
        .provide(token, provider1)
        .provide(token, provider2)
        .provide(token, provider3)

      const result1 = await container.inject(token, ProvideScope.TRANSIENT)
      const result2 = await container.inject(token, ProvideScope.TRANSIENT)
      const result3 = await container.inject(token, ProvideScope.TRANSIENT)

      expect(provider1).toBeCalledTimes(3)
      expect(provider2).toBeCalledTimes(3)
      expect(provider3).toBeCalledTimes(3)

      expect(result1).not.toBe(result2)
      expect(result2).not.toBe(result3)
    })

    it('should throw if trying to inject single-type provider as group-type one', () => {
      const token = createProviderToken<string>()

      const container = createContainer()

      container.provide(token, defineStaticProvider('test-1'))

      // @ts-expect-error - testing private property change
      token._.group = true

      expect(() => container.inject(token)).rejects.toThrowError(
        'Trying to inject single-type provider Symbol() as group-type provider'
      )
    })

    it('should throw on circular dependency with group-type token', async () => {
      const token = createGroupProviderToken<string>()

      const provider1 = defineProvider(async (injector) => {
        await injector.inject(token)

        return 'test'
      })

      const container = createContainer().provide(token, provider1)

      expect(() => container.inject(token)).rejects.toThrowError()
    })
  })
})
