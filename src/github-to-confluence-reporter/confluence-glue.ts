import { Config, ConfluencePageDetails } from './config'
import { fetchPageContents, updatePage } from '../common/confluence/raw-api'
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

export async function updateConfluence(tickets: TicketSpec[], config: Config, page: ConfluencePageDetails, execute: boolean = true) {
  const nextUp = tickets.filter(it => isToDo(it))
  const now = tickets.filter(it => isInProgress(it) || isBlocked(it))
  const recentlyDone = tickets.filter(it => isDone(it) && !it.reported)

  const newBody = renderPageBody(config.atlassianBaseUrl, config.atlasBaseUrl, nextUp, now, recentlyDone, page.goalsUid, page.weeklyUid)

  const currentPage = await getCurrentPageInfo(page.pageId, config.username, config.password, config.atlassianBaseUrl)
  console.log('Found page "' + currentPage.title + '" with version number: ' + currentPage.version)

  console.log('Updating page with new body and revision number: ' + (currentPage.version + 1))
  const webUiLink = await updatePage(
    page.pageId,
    config.username,
    config.password,
    config.atlassianBaseUrl,
    currentPage.title,
    currentPage.version,
    newBody,
    execute,
  )
  console.log('Page successfully updated.  View it here: ' + webUiLink)
}

interface ConfluencePageInfo {
  version: number
  spaceId: `${number}`
  title: string
}

async function getCurrentPageInfo(pageId: `${number}`, userEmail: string, apiToken: string, atlassianBaseUrl: string): Promise<ConfluencePageInfo> {
  console.log('Finding current page...')
  const pageInfo = await fetchPageContents(pageId, userEmail, apiToken, atlassianBaseUrl)
  return { version: +pageInfo.version.number, spaceId: pageInfo.spaceId, title: pageInfo.title }
}
