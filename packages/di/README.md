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

# Basic concepts

## Provider

Provider is... well it's basically anything. Anything that is provided to injection container or module is a provider.

Any provider is defined as a factory function that accepts `Injector`, that is injection context that allows injecting other providers.

Static values are defined as factories too, which adds a little overhead but don't add too much noize in codebase of the library and the API

The providers are provided into modules/containers using `Provider Token`, which acts like an identifier for provider without declaring its specific implementation

### Asynchronous providers

If there is some asynchronous action that should be taken on provider instantiation, the factory can also be async.

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

# Getting started

## Basic Usage

[/examples/01-basic-usage/](Example link)

Logger provider:

```ts
import { createProviderToken, defineProvider } from '@mikrokit/di'

// Factory of the service
export const loggerFactory = defineProvider(() => {
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

// Type of logger is automatically inferred from the factory definition
export const Logger = createProviderToken(loggerFactory)
```

Fetcher provider

```ts
import { createProviderToken, defineProvider } from '@mikrokit/di'
import { Logger } from './logger'

export const fetcherFactory = defineProvider(async (injector) => {
  // Injecting logger inside fetcher
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

export const Fetcher = createProviderToken(fetcherFactory)
```

And finally, compose it all together in a main application file:

```ts
import { createContainer } from '@mikrokit/di'
import { Logger, loggerFactory } from './logger'
import { Fetcher, fetcherFactory } from './fetcher'

// Just a wrapper for async code
const bootstrap = async () => {
  const container = createContainer()
    .provide(Logger, loggerFactory)
    .provide(Fetcher, fetcherFactory)

  const fetcher = await container.inject(Fetcher)

  await fetcher.fetchAndLogData('https://jsonplaceholder.typicode.com/todos/1')
}

bootstrap()
```

# Testing

One of the greatest advantages of dependency injection is code being easier to **test**. Example of how it might work:

```typescript
// In your test
const testContainer = createContainer()

// Mock dependencies
testContainer.provide(LoggerToken, defineStaticProvider(/* Mock code */))
testContainer.provide(DatabaseToken, defineStaticProvider(/* Mock code */))

// Test with mocked dependencies
const userService = await testContainer.inject(UserServiceToken)
```

## License

The MIT License (MIT)

Copyright (c) 2025-present, Artem Tarasenko
