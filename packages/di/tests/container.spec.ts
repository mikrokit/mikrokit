import {
  createContainer,
  createProviderToken,
  defineProvider,
  defineStaticProvider,
  type Injector,
} from 'src'
import { Container } from '../src/index'
import { describe, expect, it, vitest } from 'vitest'
import { ProvideScope } from 'src/container'

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

  it('should throw on circular dependency detection', () => {
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
})
