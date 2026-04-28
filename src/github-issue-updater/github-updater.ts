import { utcTimestampToLondonDate } from 'london-time'
import * as github from '../common/github/github'
import { projectNameToHeadingData } from '../common/parser/parsers'

export async function updateTickets(apiConfig: github.GithubApiConfig, boardNumber: number) {
  const dateInLondon = utcTimestampToLondonDate(new Date().toISOString())

  const board = await github.getBoardDetails(apiConfig, boardNumber)
  const fetchedTickets = await github.getAllItems(apiConfig, boardNumber)
  if (fetchedTickets.filter(it => !it.isArchived).length === 0) throw Error('Found empty board - likely an issue on the Github end')
  console.log(`Found ${fetchedTickets.length} tickets`)

  const tickets = fetchedTickets.map(it => {
    const fieldsFromProject = projectNameToHeadingData(it.projectGHField)
    const statusEnum = github.statusTextToEnum(it.statusGHField)
    return {
      ...it,
      statusEnum: statusEnum,
      parsedFromTitle: fieldsFromProject,
      reported: it.reportedGHField?.toLowerCase() === 'reported',
    }
  })

  const allActions = findActionsToPerform(tickets, apiConfig, board, dateInLondon)

  for (const it of allActions) {
    console.log(' > ' + it.description)
    await it.action()
  }
}

type ResolvedTicket = Omit<github.GHTicketSpec, 'reported'> & {
  statusEnum: github.TicketStatus
  parsedFromTitle: { parsedJiraEpic: string | null; parsedAtlasProject: string | null; parsedProjectName: string | null }
  reported: boolean
}
function findActionsToPerform(
  tickets: Array<ResolvedTicket>,
  apiConfig: github.GithubApiConfig,
  board: github.GHBoardSpec,
  dateInLondon: string,
): { description: string; action: () => Promise<void> }[] {
  const jiraFieldNeedsChanging = tickets
    .filter(it => !it.isArchived)
    .filter(it => it.jiraEpicGHField !== it.parsedFromTitle.parsedJiraEpic)
    .map(ticket => ({
      description: `Changing Jira epic for ticket [${ticket.title}] from [${ticket.jiraEpicGHField}] to [${ticket.parsedFromTitle.parsedJiraEpic}]`,
      action: async () => github.setFieldText(apiConfig, board.id, board.jiraEpicField.id, ticket.id, ticket.parsedFromTitle.parsedJiraEpic),
    }))

  const atlasFieldNeedsChanging = tickets
    .filter(it => !it.isArchived)
    .filter(it => it.atlasProjectGHField !== it.parsedFromTitle.parsedAtlasProject)
    .map(ticket => ({
      description: `Changing Atlas project for ticket [${ticket.title}] from [${ticket.atlasProjectGHField}] to [${ticket.parsedFromTitle.parsedAtlasProject}]`,
      action: async () => github.setFieldText(apiConfig, board.id, board.atlasProjectField.id, ticket.id, ticket.parsedFromTitle.parsedAtlasProject),
    }))

  const STATUSES_CAUSING_START_DATES = ['IN_PROGRESS', 'BLOCKED', 'DONE'] as github.TicketStatus[]
  const startDateNeedsSettingToToday = tickets
    .filter(it => !it.isArchived)
    .filter(it => it.startDateGHField === null && STATUSES_CAUSING_START_DATES.includes(it.statusEnum))
    .map(ticket => ({
      description: `Setting start date for ticket [${ticket.title}] from [${ticket.startDateGHField}] to [${dateInLondon}]`,
      action: async () => github.setFieldDate(apiConfig, board.id, board.startDateField.id, ticket.id, dateInLondon),
    }))

  const STATUSES_CAUSING_END_DATES = ['DONE'] as github.TicketStatus[]
  const endDateNeedsSettingToToday = tickets
    .filter(it => !it.isArchived)
    .filter(it => it.endDateGHField === null && STATUSES_CAUSING_END_DATES.includes(it.statusEnum))
    .map(ticket => ({
      description: `Setting end date for ticket [${ticket.title}] from [${ticket.endDateGHField}] to [${dateInLondon}]`,
      action: async () => github.setFieldDate(apiConfig, board.id, board.endDateField.id, ticket.id, dateInLondon),
    }))

  return [jiraFieldNeedsChanging, atlasFieldNeedsChanging, startDateNeedsSettingToToday, endDateNeedsSettingToToday].flat()
}
