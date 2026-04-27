import * as github from '../common/github/github'
import { projectNameToHeadingData } from '../common/parser/parsers'
import { type ConfluencePageDetails, Config } from './config'
import { updateConfluence } from './confluence-glue'
import * as githubBoard from './github-board'

export async function summariseAndTidyBoard(config: Config, page: ConfluencePageDetails, githubProjectId: number) {
  const board = await github.getBoardDetails(config.githubApiConfig, githubProjectId)
  const githubTickets = await github.getAllItems(config.githubApiConfig, githubProjectId)
  if (githubTickets.length === 0) throw Error('Found empty board - likely an issue on the Github end')

  const githubTicketsWithParsedHeader = githubTickets.map(it => {
    const fieldsFromProject = projectNameToHeadingData(it.projectGHField)
    return { ...it, ...fieldsFromProject }
  })

  const tickets = githubTicketsWithParsedHeader
    .filter(it => !it.isArchived)
    .map(it => ({
      title: it.title ?? '(Unknown)',
      projectName: it.parsedProjectName ?? '(Unknown)',
      jiraEpic: it.parsedJiraEpic,
      atlasProject: it.parsedAtlasProject,
      status: it.statusGHField ?? 'Unknown',
      reported: it.reportedGHField?.toLowerCase() === 'reported',
    }))

  await updateConfluence(config.confluenceApiConfig, tickets, page)

  await githubBoard.archivePreviousReported(config.githubApiConfig, githubTickets, board)
  await githubBoard.moveToDoneAndReportedAndAddReportedLabel(config.githubApiConfig, githubTickets, board)
}
