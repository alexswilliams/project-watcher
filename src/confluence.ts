import { Config } from './config'

interface TicketSpec {
  title: string
  project: string
  status: string
}

const TODO_STATUS = 'To Do'
const IN_PROGRESS_STATUS = 'In progress'
const BLOCKED_STATUS = 'Blocked'
const DONE_STATUS = 'Done'

export async function updateConfluence(tickets: TicketSpec[], config: Config) {
  const token = Buffer.from(config.username + ':' + config.password).toString('base64')
  const pageUrl = `${config.atlassianBaseUrl}/wiki/rest/api/content/${config.pageId}`

  const nextUp = tickets.filter(it => it.status === TODO_STATUS)
  const now = tickets.filter(it => it.status === IN_PROGRESS_STATUS || it.status == BLOCKED_STATUS)
  const recentlyDone = tickets.filter(it => it.status === DONE_STATUS)

  const newBody = renderPageBody(config.atlassianBaseUrl, nextUp, now, recentlyDone)

  const [currentVersion, currentTitle] = await getCurrentPageInfo(pageUrl, token)
  console.log('Found page "' + currentTitle + '" with revision number: ' + currentVersion)
  const webUiLink = await updatePage(pageUrl, token, config.pageId, currentTitle, config.spaceName, currentVersion, newBody)
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
) {
  console.log('Updating page with new body and revision number: ' + (currentVersion + 1))
  const updateResponse = await fetch(pageUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + token,
      'User-Agent': 'Project Watcher',
    },
    body: JSON.stringify({
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
    }),
  })
  if (!updateResponse.ok) {
    console.error('Could not post update to page\n', await updateResponse.json())
    throw Error('Could not post update')
  }
  const uploadResponseBody = (await updateResponse.json()) as { _links: { base: string; webui: string } }
  return uploadResponseBody['_links'].base + uploadResponseBody['_links'].webui
}

function renderPageBody(baseUrl: string, nextUp: TicketSpec[], now: TicketSpec[], recentlyDone: TicketSpec[]): string {
  interface ProjectSpec {
    heading: string
    jira: string | null
    tickets: string[]
  }
  function renderJiraLink(ticket: string): string {
    return `<a href="${baseUrl}/browse/${ticket}">${ticket}</a>`
  }
  function projectNameToHeadingData(it: string): [string | null, string, string] {
    // Finds jira numbers at the start or end of strings, with some optional separation, and splits each part out
    const match = /(?<toRemove>(:|-)?[ ]?(?<jira>[A-Z]{3,}-\d+)[ ]?(:|-)?)/.exec(it)
    if (match === null) return [null, it.trim(), it]
    return [match.groups?.jira ?? null, it.replace(match.groups?.toRemove ?? '', '').trim(), it]
  }
  function ticketsByProject(ticketList: TicketSpec[]): ProjectSpec[] {
    return [...new Set(ticketList.map(it => it.project))]
      .map(projectNameToHeadingData)
      .sort()
      .map(([jira, heading, project]) => ({
        heading,
        jira,
        tickets: ticketList.filter(it => it.project === project).map(it => (jira === null ? it.title : `${renderJiraLink(jira)}: ${it.title}`)),
      }))
  }
  function renderSection(sectionTitle: string, project: ProjectSpec) {
    return `  <h6>${sectionTitle} - ${project.heading}</h6>
  <ul>
${project.tickets.map(ticket => `    <li><p>${ticket}</p></li>`).join('\n')}
  </ul>`
  }

  return `
<b>Updated</b>: ${new Date().toISOString().slice(0, 10)}
<h1>Goals</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="482aaeaf-142c-416b-a7cd-eb6228de1505" ac:macro-id="4f8ab446f6b433bfcfc4747dec9e22af">
  <ac:parameter ac:name="name">goals-inner</ac:parameter>
  <ac:rich-text-body>
  <h6>Now</h6>
  <ul>
${ticketsByProject(now)
  .map(project => `${project.jira === null ? project.heading : renderJiraLink(project.jira) + ': ' + project.heading}`)
  .map(it => `    <li>${it}</li>`)
  .join('\n')}
  </ul>
  <h6>Next Up</h6>
  <ul>
${ticketsByProject(nextUp)
  .map(project => `${project.jira === null ? project.heading : renderJiraLink(project.jira) + ': ' + project.heading}`)
  .map(it => `    <li>${it}</li>`)
  .join('\n')}
  </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Weekly Engineering</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="4ceae4f5-6037-413a-b266-6222debaeb32" ac:macro-id="4f8ab446f6b433bfcfc4747dec9e22af">
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
