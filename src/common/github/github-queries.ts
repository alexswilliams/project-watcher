import path from 'path'
import fs from 'fs'
import { queryGithubGraphQl, queryGithubGraphQlPaged } from './raw-api'

function loadQuery(filename: string): string {
  return fs.readFileSync(path.join(__dirname, filename), { encoding: 'utf8' })
}

const boardQuery = loadQuery('find-board-details.graphql')
export interface GHBoardSpec {
  id: string
  title: string
  number: number
  url: string
  statusField: {
    id: string
    options: Array<{ id: string; name: string }>
  }
  projectField: { id: string }
  jiraEpicField: { id: string }
  atlasProjectField: { id: string }
  reportedField: {
    id: string
    options: Array<{ id: string; name: string }>
  }
}
interface GHProjectBoardResponse {
  organization: {
    projectV2: GHBoardSpec
  }
}
export async function getBoardDetails(token: string, orgName: string, projectNumber: number): Promise<GHBoardSpec> {
  const project = await queryGithubGraphQl<GHProjectBoardResponse>(token, boardQuery, {
    orgName: orgName,
    projectNumber: projectNumber,
  })
  return project.data.organization.projectV2
}

const projectQuery = loadQuery('find-page-of-items-on-board.graphql')
interface GHProjectQueryResponse {
  organization: {
    projectV2: {
      items: {
        pageInfo: {
          hasNextPage: boolean
          endCursor: string | null
        }
        nodes: Array<{
          id: string
          type: 'ISSUE' | 'DRAFT_ISSUE'
          isArchived: boolean
          title: { text: string | null } | null
          project: { text: string | null } | null
          jiraEpic: { text: string | null } | null
          atlasProject: { text: string | null } | null
          startDate: { text: string | null } | null
          endDate: { text: string | null } | null
          status: { name: string | null } | null
          reported: { name: string | null } | null
        }>
      }
    }
  }
}
export interface GHTicketSpec {
  id: string
  isDraft: boolean
  isArchived: boolean
  projectGHField: string | null
  jiraEpicGHField: string | null
  atlasProjectGHField: string | null
  startDate: string | null
  endDate: string | null
  status: string | null
  reported: string | null
  title: string | null
}
export async function getAllItems(token: string, orgName: string, projectNumber: number): Promise<GHTicketSpec[]> {
  const issues: GHTicketSpec[] = []
  await queryGithubGraphQlPaged<GHProjectQueryResponse>(token, projectQuery, { orgName, projectNumber }, payload => {
    const itemsRoot = payload.organization.projectV2.items
    issues.push(
      ...itemsRoot.nodes.map(node => ({
        id: node.id,
        isDraft: node.type === 'DRAFT_ISSUE',
        isArchived: node.isArchived,
        projectGHField: node.project?.text ?? null,
        jiraEpicGHField: node.jiraEpic?.text ?? null,
        atlasProjectGHField: node.atlasProject?.text ?? null,
        startDate: node.startDate?.text ?? null,
        endDate: node.endDate?.text ?? null,
        status: node.status?.name ?? null,
        reported: node.reported?.name ?? null,
        title: node.title?.text ?? null,
      })),
    )
    return itemsRoot.nodes.length > 0 && itemsRoot.pageInfo.hasNextPage ? { lastItem: payload.organization.projectV2.items.pageInfo.endCursor } : null
  })
  return issues
}
