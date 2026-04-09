import { type Config, type ConfluencePageDetails } from './config'
import { updateConfluence } from '../common/confluence/confluence'
import * as github from '../common/github/github'
import * as githubBoard from './github-board'
import { projectNameToHeadingData } from '../common/parser/parsers'

export async function summariseBoardToConfluence(config: Config, page: ConfluencePageDetails, githubProjectId: number) {
  const board = await github.getBoardDetails(config.githubToken, config.githubOrgName, githubProjectId)
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
      reported: it.reported,
    }))

  if (config.canModifyConfluence) {
    await updateConfluence(tickets, config, page)
  } else console.log(' ! NOT updating confluence.')

  if (config.canModifyBoard) {
    await githubBoard.archivePreviousReported(githubTickets, board, config)
    await githubBoard.moveToDoneAndReportedAndAddReportedLabel(githubTickets, board, config)
  } else console.log(' ! NOT moving tickets on github board.')
}
