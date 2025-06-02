export function projectNameToHeadingData(it: string): {
  parsedJiraEpic: string | null
  parsedAtlasProject: string | null
  parsedProjectName: string | null
} {
  const jiraEpics = [...it.matchAll(/(^|[^A-Z])(?<epic>[A-Z]{4}-\d+)/g)]
  const atlasProjects = [...it.matchAll(/(^|[^A-Z])(?<atlasProject>[A-Z]{8}-\d+)/g)]
  const headingText = /(?<heading>.+)[ ]*(: |- )/.exec(it)
  return {
    parsedJiraEpic: jiraEpics[0]?.groups?.epic ?? null,
    parsedAtlasProject: atlasProjects[0]?.groups?.atlasProject ?? null,
    parsedProjectName: headingText?.groups?.heading?.trim() ?? null,
  }
}
