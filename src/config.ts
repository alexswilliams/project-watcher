export interface Config {
  atlassianBaseUrl: string
  username: string
  password: string
  pageId: string
  spaceName: string
  githubToken: string
  githubOrgName: string
  githubProjectId: number
  lambdaSecretName: string
}
export const config: Config = {
  atlassianBaseUrl: process.env.ATLASSIAN_BASE_URL ?? '',
  username: process.env.ATLASSIAN_EMAIL ?? '',
  password: process.env.ATLASSIAN_API_TOKEN ?? '',
  pageId: process.env.CONFLUENCE_PAGE_ID!!,
  spaceName: process.env.CONFLUENCE_SPACE_NAME!!,

  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',
  githubProjectId: Number(process.env.GITHUB_PROJECT_ID!!),

  lambdaSecretName: process.env.LAMBDA_SECRET_NAME ?? '',
}
