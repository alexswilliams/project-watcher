import { AtlassianApiConfig, fetchPageContents, updatePage } from '../common/confluence/raw-api'
import { ConfluencePageDetails } from './config'
import { renderPageBody } from './confluence-renderer'

export interface TicketSpec {
  title: string
  projectName: string
  jiraEpic: string | null
  atlasProject: string | null
  status: string
  reported: boolean
}

const TODO_STATUS = 'To Do'
const IN_PROGRESS_STATUS = 'In progress'
const BLOCKED_STATUS = 'Blocked'
const DONE_STATUS = 'Done'
const isToDo = (it: TicketSpec): boolean => it.status.toLowerCase() === TODO_STATUS.toLowerCase()
const isInProgress = (it: TicketSpec): boolean => it.status.toLowerCase() === IN_PROGRESS_STATUS.toLowerCase()
const isBlocked = (it: TicketSpec): boolean => it.status.toLowerCase() === BLOCKED_STATUS.toLowerCase()
const isDone = (it: TicketSpec): boolean => it.status.toLowerCase() === DONE_STATUS.toLowerCase()

export async function updateConfluence(apiConfig: AtlassianApiConfig, tickets: TicketSpec[], page: ConfluencePageDetails) {
  const nextUp = tickets.filter(it => isToDo(it))
  const now = tickets.filter(it => isInProgress(it) || isBlocked(it))
  const recentlyDone = tickets.filter(it => isDone(it) && !it.reported)

  const newBody = renderPageBody(apiConfig.atlassianBaseUrl, apiConfig.atlasBaseUrl, nextUp, now, recentlyDone, page.goalsUid, page.weeklyUid)

  const currentPage = await getCurrentPageInfo(apiConfig, page.pageId)
  console.log('Found page "' + currentPage.title + '" with version number: ' + currentPage.version)

  console.log('Updating page with new body and revision number: ' + (currentPage.version + 1))
  const webUiLink = await updatePage(apiConfig, page.pageId, currentPage.title, currentPage.version, newBody)
  console.log('Page successfully updated.  View it here: ' + webUiLink)
}

interface ConfluencePageInfo {
  version: number
  spaceId: `${number}`
  title: string
}

async function getCurrentPageInfo(apiConfig: AtlassianApiConfig, pageId: `${number}`): Promise<ConfluencePageInfo> {
  console.log('Finding current page...')
  const pageInfo = await fetchPageContents(apiConfig, pageId)
  return { version: +pageInfo.version.number, spaceId: pageInfo.spaceId, title: pageInfo.title }
}
