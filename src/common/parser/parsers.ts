export function projectNameToHeadingData(it: string): {
  parsedJiraEpic: string | null
  parsedAtlasProject: string | null
  parsedProjectName: string | null
} {
  const groups = it.split(/- |[,:]/)
  let lastJiraGroup = -1
  let lastAltasGroup = -1
  groups.forEach((s, index) => {
    if (/^[A-Z]{4}-\d+$/.test(s.trim())) lastJiraGroup = index
    else if (/^[A-Z]{8}-\d+$/.test(s.trim())) lastAltasGroup = index
  })

  const jiraEpic = lastJiraGroup === -1 ? null : groups[lastJiraGroup].trim()
  const atlasProject = lastAltasGroup === -1 ? null : groups[lastAltasGroup].trim()

  const headingText = /^(?<heading>.+)[-: ]*(:|- )/.exec(it)
  return {
    parsedJiraEpic: jiraEpic,
    parsedAtlasProject: atlasProject,
    parsedProjectName: headingText?.groups?.heading?.trim() ?? it.trim(),
  }
}
