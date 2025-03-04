import { createContainer } from '@mikrokit/di'
import { Logger } from './logger'
import { Fetcher } from './fetcher'

const bootstrap = async () => {
  const container = createContainer().provide(Logger).provide(Fetcher)

  const fetcher = await container.inject(Fetcher)

  await fetcher.fetchAndLogData('https://jsonplaceholder.typicode.com/todos/1')
}

bootstrap()
