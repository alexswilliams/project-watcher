import { Config } from './config'
import { updateTickets } from './github-updater'

export async function main(config: Config): Promise<void> {
  await updateTickets(config.githubApiConfig, config.boardNumber)
  console.info('Completed successfully')
}

// Only the lambda sets the AWS region.  The lambda will invoke `main`.  If running on the CLI, we have to do it manually.
if ((process.env.AWS_REGION ?? '') === '') {
  main(new Config())
}
