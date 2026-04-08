import { Config } from './config'
import * as github from './github'

export async function moveDoneToReported(githubTickets: github.GHTicketSpec[], projectBoard: github.GHBoardSpec, config: Config) {
  const doneAndReportedStatus = projectBoard.statusField.options.find(it => it.name === 'Done & Reported')
  if (!doneAndReportedStatus) throw Error('Could not find the Done & Reported status column on the project board')
  const doneTickets = githubTickets.filter(it => !it.isArchived).filter(it => it.status === 'Done')
  for (const ticket of doneTickets) {
    console.log(` > Marking issue ${ticket.title} as reported`)
    await github.moveItemToDoneAndReported(config.githubToken, projectBoard.id, projectBoard.statusField.id, ticket.id, doneAndReportedStatus.id)
  }
}

export async function archivePreviousReported(githubTickets: github.GHTicketSpec[], projectBoard: github.GHBoardSpec, config: Config) {
  const reportedTickets = githubTickets.filter(it => !it.isArchived).filter(it => it.status === 'Done & Reported')
  for (const ticket of reportedTickets) {
    console.log(` * Archiving ${ticket.title}`)
    await github.archiveIssue(config.githubToken, projectBoard.id, ticket.id)
  }
}

export async function setJiraAndAtlasFields(
  githubTicketsWithParsedHeader: Array<
    github.GHTicketSpec & {
      parsedJiraEpic: string | null
      parsedAtlasProject: string | null
    }
  >,
  config: Config,
  projectBoard: github.GHBoardSpec,
) {
  const ticketsToUpdateLinksOn = githubTicketsWithParsedHeader.filter(it => {
    const atlasNeedsUpdating = (it.atlasProjectGHField?.trim() ?? '') !== (it.parsedAtlasProject ?? '')
    const jiraNeedsUpdating = (it.jiraEpicGHField?.trim() ?? '') !== (it.parsedJiraEpic ?? '')
    return atlasNeedsUpdating || jiraNeedsUpdating
  })
  if (ticketsToUpdateLinksOn.length > 0) {
    for (const ticket of ticketsToUpdateLinksOn) {
      console.log(` * Updating Jira and Atlas fields for ${ticket.title}`)
      await github.setFieldText(config.githubToken, projectBoard.id, projectBoard.atlasProjectField.id, ticket.id, ticket.parsedAtlasProject ?? '')
      await github.setFieldText(config.githubToken, projectBoard.id, projectBoard.jiraEpicField.id, ticket.id, ticket.parsedJiraEpic ?? '')
    }
  }
}
