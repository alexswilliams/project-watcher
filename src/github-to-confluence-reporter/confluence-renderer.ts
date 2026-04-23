import { encode } from 'html-entities'
import { TicketSpec } from './confluence-glue'

interface ProjectSpec {
  projectName: string
  jiraEpic: string | null
  atlasProject: string | null
  tickets: string[]
}

function renderJiraLink(baseJiraUrl: string, jiraEpic: string): string {
  return `<a href="${baseJiraUrl}/browse/${encodeURIComponent(jiraEpic)}">${encode(jiraEpic)}</a>`
}
function renderAtlasLink(baseAtlasUrl: string, atlasProject: string): string {
  return `<a href="${baseAtlasUrl}/project/${encodeURIComponent(atlasProject)}">${encode(atlasProject)}</a>`
}
function renderLinkPair(baseJiraUrl: string, baseAtlasUrl: string, jiraEpic: string | null, atlasProject: string | null): string | null {
  if (jiraEpic === null && atlasProject === null) return null
  if (jiraEpic !== null && atlasProject === null) return renderJiraLink(baseJiraUrl, jiraEpic)
  if (jiraEpic === null && atlasProject !== null) return renderAtlasLink(baseAtlasUrl, atlasProject)
  return `${renderJiraLink(baseJiraUrl, jiraEpic!)}, ${renderAtlasLink(baseAtlasUrl, atlasProject!)}`
}
function renderProjectNameLine(links: string | null, projectName: string): string {
  return `${links === null ? '' : links + ': '}${encode(projectName)}`
}

function ticketsByProject(ticketList: TicketSpec[]): ProjectSpec[] {
  return [...new Set(ticketList.map(it => it.projectName))].sort().map(projectName => ({
    projectName,
    jiraEpic: ticketList.find(ticket => ticket.projectName === projectName)!.jiraEpic,
    atlasProject: ticketList.find(ticket => ticket.projectName === projectName)!.atlasProject,
    tickets: ticketList.filter(ticket => ticket.projectName === projectName).map(ticket => ticket.title),
  }))
}

function renderSectionTitle(sectionTitle: string, projectName: string, links: string | null): string {
  return `${encode(sectionTitle)} - ${encode(projectName)}${links === null ? '' : ': ' + links}`
}

function renderSection(baseJiraUrl: string, baseAtlasUrl: string, sectionTitle: string, project: ProjectSpec) {
  const links = renderLinkPair(baseJiraUrl, baseAtlasUrl, project.jiraEpic, project.atlasProject)
  return `  <h6>${renderSectionTitle(sectionTitle, project.projectName, links)}</h6>
  <ul>
${project.tickets.map(ticket => `    <li><p>${encode(ticket)}</p></li>`).join('\n')}
  </ul>`
}

export function renderPageBody(
  baseJiraUrl: string,
  baseAtlasUrl: string,
  nextUp: TicketSpec[],
  now: TicketSpec[],
  recentlyDone: TicketSpec[],
  goalsUid: string,
  weeklyUid: string,
): string {
  const nowTitlesWithLinks = ticketsByProject(now).map(project => {
    const links = renderLinkPair(baseJiraUrl, baseAtlasUrl, project.jiraEpic, project.atlasProject)
    return renderProjectNameLine(links, project.projectName)
  })
  const nextUpTitlesWithLinks = ticketsByProject(nextUp).map(project => {
    const links = renderLinkPair(baseJiraUrl, baseAtlasUrl, project.jiraEpic, project.atlasProject)
    return renderProjectNameLine(links, project.projectName)
  })

  return `
<b>Updated</b>: ${new Date().toISOString().slice(0, 10)}

<p><i>Changes to this page will be lost - this page is updated automatically every Tuesday evening based on the team GitHub board.  See <a href="https://github.com/alexswilliams/project-watcher">Project-Watcher</a> for more details on this integration.</i></p>

<h1>Goals</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="${goalsUid}" ac:macro-id="4f8ab446f6b433bfcfc4747dec9e22af">
  <ac:parameter ac:name="name">goals-inner</ac:parameter>
  <ac:rich-text-body>
  <h6>Now</h6>
  <ul>
${nowTitlesWithLinks.map(it => `    <li>${it}</li>`).join('\n')}
  </ul>
  <h6>Next Up</h6>
  <ul>
${nextUpTitlesWithLinks.map(it => `    <li>${it}</li>`).join('\n')}
  </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Weekly Engineering</h1>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" data-layout="default" ac:local-id="${weeklyUid}" ac:macro-id="2d49dcc6-c044-4de4-9b64-0037bd43188d">
  <ac:parameter ac:name="name">weekly-eng-inner</ac:parameter>
  <ac:rich-text-body>
${ticketsByProject(recentlyDone)
  .map(project => renderSection(baseJiraUrl, baseAtlasUrl, 'Recently Done', project))
  .join('\n')}
  <hr />
${ticketsByProject(now)
  .map(project => renderSection(baseJiraUrl, baseAtlasUrl, 'Now', project))
  .join('\n')}
  </ac:rich-text-body>
</ac:structured-macro>
<p />
`
}

export const _forTesting = {
  renderLinkPair,
  renderProjectNameLine,
  renderSectionTitle,
}
