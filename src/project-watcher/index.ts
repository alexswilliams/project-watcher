import { Config, ConfluencePageDetails, config } from './config'
import { updateConfluence } from './confluence'
import * as github from './github'

export async function main(config: Config) {
  console.log('Received mappings: ', config.projectBoardConfluenceMappings)
  for (const [githubProjectId, confluencePageDetails] of Object.entries(config.projectBoardConfluenceMappings)) {
    try {
      console.log('Processing board: ', githubProjectId, confluencePageDetails)
      await exportBoard(config, confluencePageDetails, Number(githubProjectId))
    } catch (e) {
      console.error('Failed to export board, skipping: ', githubProjectId, confluencePageDetails, e)
    }
  }
  console.log('Complete')
}

async function exportBoard(config: Config, page: ConfluencePageDetails, githubProjectId: number) {
  const projectBoard = await github.getBoardDetails(config.githubToken, config.githubOrgName, githubProjectId)
  const githubTickets = await github.getAllItems(config.githubToken, config.githubOrgName, githubProjectId)

  const tickets = githubTickets
    .filter(it => !it.isArchived)
    .map(it => ({ title: it.title ?? '(Unknown)', project: it.project ?? 'Project Work', status: it.status ?? 'Unknown' }))

  await updateConfluence(tickets, config, page)

  if (config.canModifyBoard) {
    await archivePreviousReported(githubTickets, projectBoard, config)
    await moveDoneToReported(githubTickets, projectBoard, config)
  } else {
    console.log(' ! NOT updating github board.')
  }
}

async function moveDoneToReported(githubTickets: github.GHTicketSpec[], projectBoard: github.GHBoardSpec, config: Config) {
  const doneAndReportedStatus = projectBoard.statusField.options.find(it => it.name === 'Done & Reported')
  if (!doneAndReportedStatus) throw Error('Could not find the Done & Reported status column on the project board')
  const doneTickets = githubTickets.filter(it => !it.isArchived).filter(it => it.status === 'Done')
  for (const ticket of doneTickets) {
    console.log(` > Marking issue ${ticket.title} as reported`)
    await github.moveItemToDoneAndReported(config.githubToken, projectBoard.id, projectBoard.statusField.id, ticket.id, doneAndReportedStatus.id)
  }
}
async function archivePreviousReported(githubTickets: github.GHTicketSpec[], projectBoard: github.GHBoardSpec, config: Config) {
  const reportedTickets = githubTickets.filter(it => !it.isArchived).filter(it => it.status === 'Done & Reported')
  for (const ticket of reportedTickets) {
    console.log(` * Archiving ${ticket.title}`)
    await github.archiveIssue(config.githubToken, projectBoard.id, ticket.id)
  }
}

if (config.lambdaCredentialsBucketName === '') main(config)
