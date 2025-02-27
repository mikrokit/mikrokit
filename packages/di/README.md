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

## Basic Usage

```typescript
import {
  createContainer,
  createProviderToken,
  defineProvider,
  defineStaticProvider,
} from '@mikrokit/di'

// 1. Define provider factories and tokens

const loggerFactory = defineStaticProvider({
  log: (message) => console.log(`[INFO] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
})

const Logger = createProviderToken<Logger>()

const usersServiceFactory = defineProvider(async (injector) => {
  const logger = await injector.inject(Logger)

  const createUser = async (name: string) => {
    logger.log(`User with name ${name} is created`)

    return {
      name,
    }
  }

  return {
    createUser,
  }
})

const UsersService = createProviderToken(usersServiceFactory)

// 2. Create a container
const container = createContainer()

// 3. Register your providers
container
  .provide(Logger, loggerFactory)
  .provide(UsersService, usersServiceFactory)

// 4. Use the container to get instances of your dependencies
const main = async () => {
  const userService = await container.inject(UserServiceToken)
  userService.createUser('John Doe')
}

main()
```

## Core Concepts

### Tokens

Tokens are symbols used to identify dependencies. They are created using the `createProviderToken` function:

```typescript
// Create a token by type
const LoggerToken = createProviderToken<Logger>()

const usersServiceFactory = defineProvider(async (injector) => {
  // ...
})

// Create token from factory
const UsersService = createProviderToken(usersServiceFactory)

// Create a token with a name (helps with debugging)
const UserServiceNamed = createProviderToken(usersServiceFactory, 'UserService')
```

### Providers

Providers define how to create instances of your dependencies. There are two ways to create providers:

#### Static Provider

Use `defineStaticProvider` for values that don't have dependencies:

```typescript
// Define a static provider that always returns the same value
const configProvider = defineStaticProvider({
  apiUrl: 'https://api.example.com',
  timeout: 5000,
})
```

#### Factory Provider

Use `defineProvider` for dependencies that need to inject other dependencies:

```typescript
// Define a provider that needs to inject other dependencies
const userServiceProvider = defineProvider(async (injector) => {
  const logger = await injector.inject(LoggerToken)
  const config = await injector.inject(ConfigToken)
  return new UserService(logger, config)
})
```

### Scope

Dependencies can be registered with different scopes:

- **SINGLETON** (default): The provider is instantiated once and reused
- **TRANSIENT**: The provider is instantiated each time it is injected

```typescript
// Import from the container module to use scopes
import { ProvideScope } from '@mikrokit/di'

// Get a singleton instance (default)
const logger = await container.inject(LoggerToken)

// Always get a new instance
const freshLogger = await container.inject(LoggerToken, ProvideScope.TRANSIENT)
```

## Modules

Modules help organize related providers:

```typescript
import { createModule } from 'ts-dependency-injection'

// Create a module for logging
const loggingModule = createModule()
  .provide(LoggerToken, loggerProvider)
  .provide(LogFormatterToken, formatterProvider)

// Create a module for database
const databaseModule = createModule()
  .provide(DatabaseToken, databaseProvider)
  .provide(RepositoryToken, repositoryProvider)

// Create a container and import all modules
const container = createContainer().import(loggingModule).import(databaseModule)
```

## Advanced Usage

### Asynchronous Providers

Providers can be asynchronous, which is useful for dependencies that need initialization:

```typescript
const DatabaseToken = createProviderToken<Database>()

const databaseProvider = defineProvider(async () => {
  const db = new Database()
  await db.connect()
  return db
})

container.provide(DatabaseToken, databaseProvider)
```

### Circular Dependency Detection

The container automatically detects circular dependencies and throws a clear error message:

```typescript
// This will throw an error during injection
const CircularA = createProviderToken<ServiceA>()
const CircularB = createProviderToken<ServiceB>()

container
  .provide(
    CircularA,
    defineProvider(async (injector) => {
      const serviceB = await injector.inject(CircularB)
      return new ServiceA(serviceB)
    })
  )
  .provide(
    CircularB,
    defineProvider(async (injector) => {
      const serviceA = await injector.inject(CircularA)
      return new ServiceB(serviceA)
    })
  )

// Will throw: "Circular dependency on injection of key Symbol(CircularA)"
await container.inject(CircularA)
```

## Testing

The library makes it easy to test your application by swapping dependencies:

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
