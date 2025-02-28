import { createContainer } from '@mikrokit/di'
import { Logger, loggerFactory } from './logger'
import { Fetcher, fetcherFactory } from './fetcher'

const bootstrap = async () => {
  const container = createContainer()
    .provide(Logger, loggerFactory)
    .provide(Fetcher, fetcherFactory)

  const fetcher = await container.inject(Fetcher)

  await fetcher.fetchAndLogData('https://jsonplaceholder.typicode.com/todos/1')
}

bootstrap()
