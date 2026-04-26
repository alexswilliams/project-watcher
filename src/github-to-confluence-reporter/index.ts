import { Config } from './config'
import { summariseAndTidyBoard } from './summarise-board'

export async function main(config: Config): Promise<void> {
  let lastError: unknown | null = null
  for (const [githubProjectId, confluencePageDetails] of Object.entries(config.boardToPageMappings)) {
    try {
      console.info('Summarising board to confluence page: ', githubProjectId, confluencePageDetails)
      await summariseAndTidyBoard(config, confluencePageDetails, Number(githubProjectId))
    } catch (e: unknown) {
      lastError = e
      console.error('Failed to export board, skipping: ', githubProjectId, confluencePageDetails, e)
    }
  }
  if (lastError !== null) {
    console.error('Completed with errors', lastError)
    throw lastError
  }
  console.info('Completed successfully')
}

// Only the lambda sets the AWS region.  The lambda will invoke `main`.  If running on the CLI, we have to do it manually.
if ((process.env.AWS_REGION ?? '') === '') {
  main(new Config())
}
