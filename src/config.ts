export type ConfluencePageDetails = {
  pageId: string
  goalsUid: string
  weeklyUid: string
}
export type ProjectBoardToPageMapping = {
  [key: string]: ConfluencePageDetails
}

export interface Config {
  atlassianBaseUrl: string
  username: string
  password: string
  spaceName: string
  githubToken: string
  githubOrgName: string
  projectBoardConfluenceMappings: ProjectBoardToPageMapping
  lambdaSecretName: string
}
export const config: Config = {
  atlassianBaseUrl: process.env.ATLASSIAN_BASE_URL ?? '',
  username: process.env.ATLASSIAN_EMAIL ?? '',
  password: process.env.ATLASSIAN_API_TOKEN ?? '',
  spaceName: process.env.CONFLUENCE_SPACE_NAME!!,

  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',

  projectBoardConfluenceMappings: JSON.parse(process.env.GITHUB_PROJECT_TO_PAGE_MAPPINGS ?? '{}'),

  lambdaSecretName: process.env.LAMBDA_SECRET_NAME ?? '',
}
