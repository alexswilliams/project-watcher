import { Config } from './config'

async function queryGithubGraphQl(token: string, query: string, variables: Record<string, any>): Promise<unknown> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Accept: 'Accept: application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Project Watcher',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!response.ok) {
    console.error('Github response not successful', await response.text())
    throw Error('Github response not successful')
  }
  return await response.json()
}

// queries all created with some help from https://docs.github.com/en/graphql/overview/explorer
const boardQuery = `
query FindBoardDetails($orgName: String!, $projectNumber: Int!) {
  organization(login: $orgName) {
    projectV2(number: $projectNumber) {
      id
      title
      number
      url
      statusField: field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options {
            id
            name
          }
        }
      }
    }
  }
}
`
export interface GHBoardSpec {
  id: string
  title: string
  number: number
  url: string
  statusField: {
    id: string
    options: Array<{
      id: string
      name: string
    }>
  }
}
interface GHProjectBoardResponse {
  organization: {
    projectV2: GHBoardSpec
  }
}
export async function getBoardDetails(token: string, orgName: string, projectNumber: number): Promise<GHBoardSpec> {
  console.log('Reading project board information for project ' + projectNumber)
  const project = (await queryGithubGraphQl(token, boardQuery, {
    orgName: orgName,
    projectNumber: projectNumber,
  })) as { data: GHProjectBoardResponse }
  console.log('Found project board details')
  return project.data.organization.projectV2
}

const projectQuery = `
query FindAllTicketsOnProjectBoard($orgName: String!, $projectNumber: Int!, $lastItem: String) {
  organization(login: $orgName) {
    projectV2(number: $projectNumber) {
      items(
        first: 100
        after: $lastItem
        orderBy: { direction: ASC, field: POSITION }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          type
          isArchived
          title: fieldValueByName(name: "Title") {
            ... on ProjectV2ItemFieldTextValue {
              text
            }
          }
          project: fieldValueByName(name: "Project") {
            ... on ProjectV2ItemFieldTextValue {
              text
            }
          }
          status: fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
            }
          }
        }
      }
    }
  }
}
`
interface GHProjectQueryResponse {
  organization: {
    projectV2: {
      items: {
        pageInfo: {
          hasNextPage: boolean
          endCursor: string
        }
        nodes: Array<{
          id: string
          type: 'ISSUE' | 'DRAFT_ISSUE'
          isArchived: boolean
          title: { text: string | null } | null
          project: { text: string | null } | null
          status: { name: string | null } | null
        }>
      }
    }
  }
}
export interface GHTicketSpec {
  id: string
  isDraft: boolean
  isArchived: boolean
  project: string | null
  status: string | null
  title: string | null
}
async function getPageOfItemsFromGithub(
  token: string,
  orgName: string,
  projectNumber: number,
  paginationToken: string | null,
): Promise<{ nextToken: string | null; page: GHTicketSpec[] }> {
  const responseBody = (await queryGithubGraphQl(token, projectQuery, {
    orgName: orgName,
    projectNumber: projectNumber,
    lastItem: paginationToken,
  })) as { data: GHProjectQueryResponse }
  const root = responseBody.data.organization.projectV2
  return {
    nextToken: root.items.pageInfo.hasNextPage ? root.items.pageInfo.endCursor ?? null : null,
    page: root.items.nodes.map(node => {
      return {
        id: node.id,
        isDraft: node.type == 'DRAFT_ISSUE',
        isArchived: node.isArchived,
        project: node.project?.text ?? null,
        status: node.status?.name ?? null,
        title: node.title?.text ?? null,
      }
    }),
  }
}
export async function getAllItems(token: string, orgName: string, projectNumber: number): Promise<GHTicketSpec[]> {
  const issues: GHTicketSpec[] = []
  let paginationToken: string | null = null
  console.log('Reading all issues from project ' + projectNumber)
  do {
    const { nextToken, page } = await getPageOfItemsFromGithub(token, orgName, projectNumber, paginationToken)
    issues.push(...page)
    paginationToken = nextToken
  } while (paginationToken !== null)
  console.log(`Read all ${issues.length} issues from project board`)
  return issues
}

const moveIssueMutation = `
mutation MoveIssueToStatus($projectId: ID!, $statusFieldId: ID!, $itemId: ID!, $newStatusId: String!) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $statusFieldId
      value: { singleSelectOptionId: $newStatusId }
    }
  ) {projectV2Item {id updatedAt}}
}
`
interface GHMoveIssueToStatusMutationResponse {
  updateProjectV2ItemFieldValue: {
    projectV2Item: {
      id: string
      updatedAt: string
    }
  }
}
export async function moveItemToDoneAndReported(
  token: string,
  projectId: string,
  statusFieldId: string,
  itemId: string,
  newStatusId: string,
): Promise<void> {
  const result = (await queryGithubGraphQl(token, moveIssueMutation, {
    projectId: projectId,
    statusFieldId: statusFieldId,
    itemId: itemId,
    newStatusId: newStatusId,
  })) as { data: GHMoveIssueToStatusMutationResponse }
  if (result.data.updateProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.data.updateProjectV2ItemFieldValue)
    throw Error('Unpexted ID returned when updating status of ' + itemId)
  }
}

const archiveIssueMutation = `
mutation ArchiveIssue($projectId: ID!, $itemId: ID!) {
  archiveProjectV2Item(input: {projectId: $projectId, itemId: $itemId}) {
    item {id isArchived}
  }
}
`
interface GHArchiveIssueMutationResponse {
  archiveProjectV2Item: {
    item: {
      id: string
      isArchived: boolean
    }
  }
}
export async function archiveIssue(token: string, projectId: string, itemId: string): Promise<void> {
  const result = (await queryGithubGraphQl(token, archiveIssueMutation, {
    projectId: projectId,
    itemId: itemId,
  })) as { data: GHArchiveIssueMutationResponse }
  if (result.data.archiveProjectV2Item.item.id !== itemId || result.data.archiveProjectV2Item.item.isArchived === false) {
    console.error('Unexpected result when archiving: ', result.data.archiveProjectV2Item)
    throw Error('Unpexted result returned when archiving ' + itemId)
  }
}
