import { Config, ConfluencePageDetails, config } from './config'
import { updateConfluence } from './confluence'
import * as github from './github'
import * as githubBoard from './github-board'
import { projectNameToHeadingData } from './parsers'

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
  if (config.canModifyBoard) {
    await githubBoard.setJiraAndAtlasFields(githubTicketsWithParsedHeader, config, projectBoard)
  } else console.log(' ! NOT updating textual ticket fields on github board')

  if (shouldPerformWeeklyTasks()) {
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
      await githubBoard.archivePreviousReported(githubTickets, projectBoard, config)
      await githubBoard.moveDoneToReported(githubTickets, projectBoard, config)
    } else console.log(' ! NOT moving tickets on github board.')
  } else console.log(' ! NOT performing weekly tasks')
}

if (config.lambdaCredentialsBucketName === '') main(config)
function shouldPerformWeeklyTasks() {
  // Only move tickets or update confluence on Tuesday evenings.
  return new Date().getDay() === 2
}
