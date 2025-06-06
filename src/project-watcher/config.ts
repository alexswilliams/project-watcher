export type ConfluencePageDetails = {
  pageId: string
  goalsUid: string
  weeklyUid: string
}
export type ProjectBoardToPageMapping = {
  [key: string]: ConfluencePageDetails
}

export interface Config {
  canModifyConfluence: boolean
  canModifyBoard: boolean
  atlassianBaseUrl: string
  atlasBaseUrl: string
  username: string
  password: string
  spaceName: string
  githubToken: string
  githubOrgName: string
  projectBoardConfluenceMappings: ProjectBoardToPageMapping
  lambdaCredentialsBucketName: string
  lambdaCredentialsFilePath: string
  awsRegion: string
}
export const config: Config = {
  canModifyConfluence: (process.env.GITHUB_PROJECT_JOB_CAN_MODIFY_CONFLUENCE ?? 'false').toLowerCase() === 'true',
  canModifyBoard: (process.env.GITHUB_PROJECT_JOB_CAN_MODIFY_GITHUB_BOARD ?? 'false').toLowerCase() === 'true',
  atlassianBaseUrl: process.env.ATLASSIAN_BASE_URL ?? '',
  atlasBaseUrl: process.env.ATLAS_BASE_URL ?? '',
  username: process.env.ATLASSIAN_EMAIL ?? '',
  password: process.env.ATLASSIAN_API_TOKEN ?? '',
  spaceName: process.env.CONFLUENCE_SPACE_NAME!!,

  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',

  projectBoardConfluenceMappings: JSON.parse(process.env.GITHUB_PROJECT_TO_PAGE_MAPPINGS ?? '{}'),

  lambdaCredentialsBucketName: process.env.LAMBDA_CREDENTIALS_BUCKET_NAME ?? '',
  lambdaCredentialsFilePath: process.env.LAMBDA_CREDENTIALS_FILE_PATH ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
}
