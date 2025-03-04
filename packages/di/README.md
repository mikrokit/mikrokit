# TypeScript Dependency Injection Library

A lightweight TypeScript dependency injection container that uses only strip-tipes compliant methodologies and does not rely on reflect-metadata

## Features

- Symbolic tokens for type-safe dependency resolution
- Support for singleton and transient dependency scopes
- Module system for organizing and importing provider groups
- Circular dependency detection
- Fully type-safe API

## Installation

```bash
npm install @mikrokit/di
# or
yarn add @mikrokit/di
# or
pnpm add @mikrokit/di
```

# Getting started

## 1. Create a container

Container is a thing that will manage you dependencies and give you a way to inject them

```ts
import { createContainer } from '@mikrokit/di'

const container = createContainer()
```

## 2. Define a provider

The simplest entity of dependency injection is a provider.

```ts
import { defineProvider } from '@mikrokit/di'

export const Logger = defineProvider(() => {
  const info = (message: string) => {
    console.log(`[INFO]: ${message}`)
  }

  const error = (message: string) => {
    console.error(`[ERROR]: ${message}`)
  }

  return {
    info,
    error,
  }
})
```

## 3. Provide a provider

In order for `Logger` to be accessible through `container` we will need to provide it to the container.

```ts
import { createContainer } from '@mikrokit/di'
import { Logger } from './logger'

const container = createContainer().provide(Logger)
```

## 4. Inject a provider

In order to instantiate and get the provider you provided, we can use `.inject`. Warning: this call **always returns promise**

```ts
// ...

await container.inject(Logger)
```

## 5. Injecting a provider into another provider

That's what we call DI. Let's define a different provider `Fetcher` for this. In order to inject `Logger` into `Fetcher` we will need to call `injector.inject` with the provider definition as a parameter. From this example we can actually see why `Logger` and `Fetcher` are named in PascalCase instead of camelCase - because when you will be referencing them to inject, you will probably use the camelCase version of name for the exact instance of the provider

```ts
import { defineProvider } from '@mikrokit/di'
import { Logger } from './logger'

export const Fetcher = defineProvider(async (injector) => {
  const logger = await injector.inject(Logger)

  const fetchAndLogData = async (url: string) => {
    try {
      const response = await fetch(url)
      const data = await response.text()
      logger.info(data)
    } catch (e) {
      logger.error(`${e}`)
    }
  }

  return {
    fetchAndLogData,
  }
})
```

## 6. Getting the `Fetcher`

For this, we will need to provide both `Logger` and `Fetcher` into our container and just inject the `Fetcher`.

\*NOTE: the order of `.provide` calls in container doesn't matter (at least for single providers)

```ts
import { createContainer } from '@mikrokit/di'
import { Logger } from './logger'
import { Fetcher } from './fetcher'

const container = createContainer().provide(Logger).provide(Fetcher)

const fetcher = await container.inject(Fetcher)
```

# Basic concepts

## Provider

Provider is... well it's basically anything. Anything that is provided to injection container or module is a provider.

Any provider is defined as a factory function that accepts `Injector`, that is injection context that allows injecting other providers.

Static values are defined as factories too, which adds a little overhead but don't add too much noize in codebase of the library and the API

The providers are provided into modules/containers using `Provider Token`, which acts like an identifier for provider without declaring its specific implementation.

When you use `defineProvider` the token is generated automatically and is provided through the factory. If you don't want to have attached token automatically, you can use `defineProviderFactory`, which is only a type helper that doesn't do anything to the factory you provide to it.

```ts
// Both a factory and a token
const MyProvider = defineProvider(() => 'test')

// Only a function
const myProviderFactory = defineProviderFactory(() => 'test')
```

For the cases when you already have the token that you will be defining a provider for (for example, this is the case for group providers), `defineProvider` can accept the token as a 2-nd parameter into it.

### Asynchronous providers

If there is some asynchronous action that should be taken on provider instantiation, the factory can also be async.

```ts
const Redis = defineProvider(async () => {
  const redis = new RedisConnection()

  await redis.connect()

  return redis
})
```

This, however, creates a limitation: **all injections are asynchronous**.

## Provider token

Provider token is a typed "pointer" to some provider. It is used as an injection-key

The provider tokens in `@mikrokit/di` are based on javascript symbols. This way, we ensure that each token is completely unique.

There are two types of tokens: **single tokens** and **group tokens**

### Single Tokens

Single token is a token that references only one provider in the injection. It can only be provided once and will fail to provide the second time.

Most of thins in your codebase will probably be referenced by a single-type token, such as services, repositories, configurations etc.

### Group tokens

Group token is a token that can reference 0 or more providers. There is no limit on how many providers you can provide using this token.

Group tokens are great for defining providers that would be used on higher-levels. For example, API handlers or queue system queues.

## Container

Container is a thing that allows you to provide and inject your providers. It is basically an injection container itself.

## Module

Module is a simple part that allows grouping of some providers into one thing, which can then either be:

- Imported in another module
- Imported in container

This allows creating cleaner definition files

## Injector

Injector is passed inside your providers and is basically a `Container`, but covered with the `Injector` interface so we don't have situations when providers are provided inside providers (which is not good)

It allows injecting other providers by a token

## Provision scope

Library supports two provision scoped defined in `ProvideScope` enum:

- `SINGLETON` - uses a shared copy of a provider
- `TRANSIENT` - uses a freshly instantiated copy of a provider. _Note: if a provider is injected as transient, it doesn't mean that its sub-dependencies will be injected as transient as well. If provider uses singleton injection internally, then its dependencies will be loaded as singletons_

# Testing

One of the greatest advantages of dependency injection is code being easier to **test**. Example of how it might work:

```typescript
// In your test
const testContainer = createContainer()

// Mock dependencies
testContainer.provide(Logger, defineStaticProvider(/* Mock code */))
testContainer.provide(Fetcher, defineStaticProvider(/* Mock code */))

// Test with mocked dependencies
const fetcher = await testContainer.inject(Fetcher)
```

## License

The MIT License (MIT)

Copyright (c) 2025-present, Artem Tarasenko
