import * as github from '../common/github/github'
import { GithubApiConfig } from '../common/github/raw-api'

export async function moveToDoneAndReportedAndAddReportedLabel(
  apiConfig: GithubApiConfig,
  githubTickets: github.GHTicketSpec[],
  projectBoard: github.GHBoardSpec,
) {
  const doneAndReportedStatus = projectBoard.statusField.options.find(it => it.name === 'Done & Reported')
  if (!doneAndReportedStatus) throw Error('Could not find the Done & Reported status column on the project board')
  const reportedLabel = projectBoard.reportedField.options.find(it => it.name === 'Reported')
  if (!reportedLabel) throw Error('Could not find the Reported value for the Reported field')
  const doneTickets = githubTickets.filter(it => !it.isArchived).filter(it => it.statusGHField === 'Done')
  for (const ticket of doneTickets) {
    console.log(` > Moving issue "${ticket.title}" to Done & Reported`)
    await github.setSingleOptionField(apiConfig, projectBoard.id, projectBoard.statusField.id, ticket.id, doneAndReportedStatus.id)
    console.log(` > Marking issue "${ticket.title}" as reported`)
    await github.setSingleOptionField(apiConfig, projectBoard.id, projectBoard.reportedField.id, ticket.id, reportedLabel.id)
  }
}

export async function archivePreviousReported(apiConfig: GithubApiConfig, githubTickets: github.GHTicketSpec[], projectBoard: github.GHBoardSpec) {
  const reportedTickets = githubTickets
    .filter(it => !it.isArchived)
    .filter(it => it.statusGHField === 'Done & Reported' || it.reportedGHField === 'Reported') // TODO: remove Done & Reported
  for (const ticket of reportedTickets) {
    console.log(` * Archiving "${ticket.title}"`)
    await github.archiveIssue(apiConfig, projectBoard.id, ticket.id)
  }
}

export async function setJiraAndAtlasFields(
  apiConfig: GithubApiConfig,
  githubTicketsWithParsedHeader: Array<
    github.GHTicketSpec & {
      parsedJiraEpic: string | null
      parsedAtlasProject: string | null
    }
  >,
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
      await github.setFieldText(apiConfig, projectBoard.id, projectBoard.atlasProjectField.id, ticket.id, ticket.parsedAtlasProject ?? '')
      await github.setFieldText(apiConfig, projectBoard.id, projectBoard.jiraEpicField.id, ticket.id, ticket.parsedJiraEpic ?? '')
    }
  }
}
