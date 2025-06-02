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
  const githubTicketsWithParsedHeader = githubTickets.map(it => {
    const fieldsFromProject = projectNameToHeadingData(it.projectGHField ?? 'Project Work')
    return { ...it, ...fieldsFromProject }
  })

  const tickets = githubTicketsWithParsedHeader
    .filter(it => !it.isArchived)
    .map(it => ({
      title: it.title ?? '(Unknown)',
      projectName: it.parsedProjectName ?? '(Unknown)',
      jiraEpic: it.parsedJiraEpic,
      atlasProject: it.parsedAtlasProject,
      status: it.status ?? 'Unknown',
    }))

  if (config.canModifyConfluence) {
    await updateConfluence(tickets, config, page)
  } else console.log(' ! NOT updating confluence.')

  if (config.canModifyBoard) {
    await setJiraAndAtlasFields(githubTicketsWithParsedHeader, config, projectBoard)
    await archivePreviousReported(githubTickets, projectBoard, config)
    await moveDoneToReported(githubTickets, projectBoard, config)
  } else console.log(' ! NOT updating github board.')
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

async function setJiraAndAtlasFields(
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

function projectNameToHeadingData(it: string): {
  parsedJiraEpic: string | null
  parsedAtlasProject: string | null
  parsedProjectName: string | null
} {
  const jiraEpics = [...it.matchAll(/(^|[^A-Z])(?<epic>[A-Z]{4}-\d+)/g)]
  const atlasProjects = [...it.matchAll(/(^|[^A-Z])(?<atlasProject>[A-Z]{8}-\d+)/g)]
  const headingText = /(?<heading>.+)[ ]*(: |- )/.exec(it)
  return {
    parsedJiraEpic: jiraEpics[0]?.groups?.epic ?? null,
    parsedAtlasProject: atlasProjects[0]?.groups?.atlasProject ?? null,
    parsedProjectName: headingText?.groups?.heading?.trim() ?? null,
  }
}

if (config.lambdaCredentialsBucketName === '') main(config)
