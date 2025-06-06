import { encode } from 'html-entities'
import { Config, ConfluencePageDetails } from './config'

interface TicketSpec {
  title: string
  projectName: string
  jiraEpic: string | null
  atlasProject: string | null
  status: string
}

const TODO_STATUS = 'To Do'
const IN_PROGRESS_STATUS = 'In progress'
const BLOCKED_STATUS = 'Blocked'
const DONE_STATUS = 'Done'

export async function updateConfluence(tickets: TicketSpec[], config: Config, page: ConfluencePageDetails, execute: boolean = true) {
  const token = Buffer.from(config.username + ':' + config.password).toString('base64')
  const pageUrl = `${config.atlassianBaseUrl}/wiki/rest/api/content/${page.pageId}`

  const nextUp = tickets.filter(it => it.status === TODO_STATUS)
  const now = tickets.filter(it => it.status.toLowerCase() === IN_PROGRESS_STATUS.toLowerCase() || it.status == BLOCKED_STATUS)
  const recentlyDone = tickets.filter(it => it.status === DONE_STATUS)

  const newBody = renderPageBody(config.atlassianBaseUrl, config.atlasBaseUrl, nextUp, now, recentlyDone, page.goalsUid, page.weeklyUid)

  const [currentVersion, currentTitle] = await getCurrentPageInfo(pageUrl, token)
  console.log('Found page "' + currentTitle + '" with revision number: ' + currentVersion)
  const webUiLink = await updatePage(pageUrl, token, page.pageId, currentTitle, config.spaceName, currentVersion, newBody, execute)
  console.log('Page successfully updated.  View it here: ' + webUiLink)
}

async function getCurrentPageInfo(pageUrl: string, token: string): Promise<[number, string]> {
  console.log('Finding current page...')
  const previousVersion = await fetch(pageUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + token,
      'User-Agent': 'Project Watcher',
    },
  })
  if (!previousVersion.ok) {
    console.error('Could not find previous page.\n', await previousVersion.json())
    throw Error('Could not find previous page')
  }
  const previousVersionBody = (await previousVersion.json()) as { title: string; version: { number: number } }
  if (!('version' in previousVersionBody) || typeof previousVersionBody.version.number != 'number') {
    console.error('Previous version could not be determined: invalid body.\n', previousVersionBody)
    throw Error('Response when searching for previous page was malformed')
  }
  return [+previousVersionBody.version.number as number, previousVersionBody.title as string]
}

async function updatePage(
  pageUrl: string,
  token: string,
  pageId: string,
  currentTitle: string,
  spaceKey: string,
  currentVersion: number,
  newBody: string,
  execute: boolean,
): Promise<string> {
  console.log('Updating page with new body and revision number: ' + (currentVersion + 1))
  const body = JSON.stringify({
    id: '' + pageId,
    type: 'page',
    title: currentTitle,
    space: { key: spaceKey },
    version: { number: currentVersion + 1 },
    body: {
      storage: {
        value: newBody,
        representation: 'storage',
      },
    },
  })

  if (!execute) {
    console.info('Would have uploaded to confluence: ', pageUrl, body)
    return 'https://example.org'
  }

  const updateResponse = await fetch(pageUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + token,
      'User-Agent': 'Project Watcher',
    },
    body,
  })
  if (!updateResponse.ok) {
    console.error('Could not post update to page\n', await updateResponse.json())
    throw Error('Could not post update')
  }
  const uploadResponseBody = (await updateResponse.json()) as { _links: { base: string; webui: string } }
  return uploadResponseBody['_links'].base + uploadResponseBody['_links'].webui
}

function renderPageBody(
  baseJiraUrl: string,
  baseAtlasUrl: string,
  nextUp: TicketSpec[],
  now: TicketSpec[],
  recentlyDone: TicketSpec[],
  goalsUid: string,
  weeklyUid: string,
): string {
  interface ProjectSpec {
    projectName: string
    jiraEpic: string | null
    atlasProject: string | null
    tickets: string[]
  }
  function renderJiraLink(jiraEpic: string): string {
    return `<a href="${baseJiraUrl}/browse/${encodeURIComponent(jiraEpic)}">${encode(jiraEpic)}</a>`
  }
  function renderAtlasLink(atlasProject: string): string {
    return `<a href="${baseAtlasUrl}/project/${encodeURIComponent(atlasProject)}">${encode(atlasProject)}</a>`
  }
  function ticketsByProject(ticketList: TicketSpec[]): ProjectSpec[] {
    return [...new Set(ticketList.map(it => it.projectName))].sort().map(projectName => ({
      projectName,
      jiraEpic: ticketList.find(ticket => ticket.projectName === projectName)!.jiraEpic,
      atlasProject: ticketList.find(ticket => ticket.projectName === projectName)!.atlasProject,
      tickets: ticketList.filter(ticket => ticket.projectName === projectName).map(ticket => ticket.title),
    }))
  }
  function renderLinkPair(jiraEpic: string | null, atlasProject: string | null): string | null {
    if (jiraEpic === null && atlasProject === null) return null
    if (jiraEpic !== null && atlasProject === null) return renderJiraLink(jiraEpic)
    if (jiraEpic === null && atlasProject !== null) return renderAtlasLink(atlasProject)
    return `${renderJiraLink(jiraEpic!)}, ${renderAtlasLink(atlasProject!)}`
  }
  function renderSection(sectionTitle: string, project: ProjectSpec) {
    const links = renderLinkPair(project.jiraEpic, project.atlasProject)
    return `  <h6>${encode(sectionTitle)} - ${encode(project.projectName)}${links !== null && ': ' + links}</h6>
  <ul>
${project.tickets.map(ticket => `    <li><p>${encode(ticket)}</p></li>`).join('\n')}
  </ul>`
  }

  return `
<b>Updated</b>: ${new Date().toISOString().slice(0, 10)}

<p><i>Changes to this page will be lost - this page is updated automatically every Tuesday evening based on the team GitHub board.  See <a href="https://github.com/alexswilliams/project-watcher">Project-Watcher</a> for more details on this integration.</i></p>

<h1>Goals</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="${goalsUid}" ac:macro-id="4f8ab446f6b433bfcfc4747dec9e22af">
  <ac:parameter ac:name="name">goals-inner</ac:parameter>
  <ac:rich-text-body>
  <h6>Now</h6>
  <ul>
${ticketsByProject(now)
  .map(project => {
    const links = renderLinkPair(project.jiraEpic, project.atlasProject)
    return `${links !== null && links + ': '}${encode(project.projectName)}`
  })
  .map(it => `    <li>${it}</li>`)
  .join('\n')}
  </ul>
  <h6>Next Up</h6>
  <ul>
${ticketsByProject(nextUp)
  .map(project => {
    const links = renderLinkPair(project.jiraEpic, project.atlasProject)
    return `${links !== null && links + ': '}${encode(project.projectName)}`
  })
  .map(it => `    <li>${it}</li>`)
  .join('\n')}
  </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Weekly Engineering</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="${weeklyUid}" ac:macro-id="2d49dcc6-c044-4de4-9b64-0037bd43188d">
  <ac:parameter ac:name="name">weekly-eng-inner</ac:parameter>
  <ac:rich-text-body>
${ticketsByProject(recentlyDone)
  .map(project => renderSection('Recently Done', project))
  .join('\n')}
  <hr />
${ticketsByProject(now)
  .map(project => renderSection('Now', project))
  .join('\n')}
  </ac:rich-text-body>
</ac:structured-macro>
<p />
`
}
