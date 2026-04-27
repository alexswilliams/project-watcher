import fs from 'fs'
import path from 'path'
import * as v from 'valibot'
import { GithubApiConfig, queryGithubGraphQl, queryGithubGraphQlPaged } from './raw-api'

function loadQuery(filename: string): string {
  const pathLocally = path.join(__dirname, 'graphql', filename)
  const pathInAws = path.join('/opt', filename)
  const pathToUse = [pathLocally, pathInAws].find(it => fs.existsSync(it))
  if (!pathToUse) throw Error('Could not find ' + filename)
  return fs.readFileSync(pathToUse, { encoding: 'utf8' })
}

const boardQuery = loadQuery('find-board-details.graphql')
const GHBoardSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.nonEmpty()),
  number: v.number(),
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  statusField: v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    options: v.array(v.object({ id: v.pipe(v.string(), v.nonEmpty()), name: v.pipe(v.string(), v.nonEmpty()) })),
  }),
  projectField: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
  jiraEpicField: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
  atlasProjectField: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
  startDateField: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
  endDateField: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
  reportedField: v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    options: v.array(v.object({ id: v.pipe(v.string(), v.nonEmpty()), name: v.pipe(v.string(), v.nonEmpty()) })),
  }),
})
export type GHBoardSpec = v.InferOutput<typeof GHBoardSchema>
const GHProjectBoardResponseSchema = v.object({
  organization: v.object({
    projectV2: GHBoardSchema,
  }),
})
export async function getBoardDetails(apiConfig: GithubApiConfig, projectNumber: number): Promise<GHBoardSpec> {
  const project = await queryGithubGraphQl(
    apiConfig,
    boardQuery,
    {
      orgName: apiConfig.orgName,
      projectNumber: projectNumber,
    },
    GHProjectBoardResponseSchema,
  )
  return project.organization.projectV2
}

const projectQuery = loadQuery('find-page-of-items-on-board.graphql')
const textObject = v.object({ text: v.union([v.pipe(v.string(), v.nonEmpty()), v.null()]) })
const dateObject = v.object({ date: v.union([v.pipe(v.string(), v.nonEmpty(), v.isoDate()), v.null()]) })
const nameObject = v.object({ name: v.union([v.pipe(v.string(), v.nonEmpty()), v.null()]) })
const GHProjectQueryResponseSchema = v.object({
  organization: v.object({
    projectV2: v.object({
      items: v.object({
        pageInfo: v.object({
          hasNextPage: v.boolean(),
          endCursor: v.union([v.string(), v.null()]),
        }),
        totalCount: v.number(),
        nodes: v.array(
          v.object({
            id: v.string(),
            type: v.picklist(['ISSUE', 'DRAFT_ISSUE']),
            isArchived: v.boolean(),
            title: v.union([v.null(), textObject]),
            project: v.union([v.null(), textObject]),
            jiraEpic: v.union([v.null(), textObject]),
            atlasProject: v.union([v.null(), textObject]),
            startDate: v.union([v.null(), dateObject]),
            endDate: v.union([v.null(), dateObject]),
            status: v.union([v.null(), nameObject]),
            reported: v.union([v.null(), nameObject]),
          }),
        ),
      }),
    }),
  }),
})
type GHProjectQueryResponse = v.InferOutput<typeof GHProjectQueryResponseSchema>
export interface GHTicketSpec {
  id: string
  isDraft: boolean
  isArchived: boolean
  projectGHField: string | null
  jiraEpicGHField: string | null
  atlasProjectGHField: string | null
  startDateGHField: string | null
  endDateGHField: string | null
  statusGHField: string | null
  reportedGHField: string | null
  title: string | null
}
export async function getAllItems(apiConfig: GithubApiConfig, projectNumber: number): Promise<GHTicketSpec[]> {
  const issues: GHTicketSpec[] = []
  await queryGithubGraphQlPaged<GHProjectQueryResponse>(
    apiConfig,
    projectQuery,
    { orgName: apiConfig.orgName, projectNumber },
    GHProjectQueryResponseSchema,
    payload => {
      const itemsRoot = payload.organization.projectV2.items
      issues.push(
        ...itemsRoot.nodes.map(node => ({
          id: node.id,
          isDraft: node.type === 'DRAFT_ISSUE',
          isArchived: node.isArchived,
          projectGHField: node.project?.text ?? null,
          jiraEpicGHField: node.jiraEpic?.text ?? null,
          atlasProjectGHField: node.atlasProject?.text ?? null,
          startDateGHField: node.startDate?.date ?? null,
          endDateGHField: node.endDate?.date ?? null,
          statusGHField: node.status?.name ?? null,
          reportedGHField: node.reported?.name ?? null,
          title: node.title?.text ?? null,
        })),
      )
      return itemsRoot.nodes.length > 0 && itemsRoot.pageInfo.hasNextPage
        ? { lastItem: payload.organization.projectV2.items.pageInfo.endCursor }
        : null
    },
  )
  return issues
}
