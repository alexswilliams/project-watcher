import { AtlassianApiConfig } from '../common/confluence/raw-api'
import { GithubApiConfig } from '../common/github/raw-api'

export type ConfluencePageDetails = {
  pageId: `${number}`
  goalsUid: string
  weeklyUid: string
}

interface RawConfig {
  atlassianBaseUrl: string
  atlasBaseUrl: string
  atlassianEmail: string
  atlassianApiToken: string
  canModifyConfluence: boolean

  githubToken: string
  githubOrgName: string
  githubEndpoint: string
  canModifyBoard: boolean

  projectBoardConfluenceMappings: { [key: string]: ConfluencePageDetails }
}

const configFromEnvironment: RawConfig = {
  atlassianBaseUrl: process.env.ATLASSIAN_BASE_URL ?? '',
  atlasBaseUrl: process.env.ATLAS_BASE_URL ?? '',
  atlassianEmail: process.env.ATLASSIAN_EMAIL ?? '',
  atlassianApiToken: process.env.ATLASSIAN_API_TOKEN ?? '',
  canModifyConfluence: (process.env.GITHUB_PROJECT_JOB_CAN_MODIFY_CONFLUENCE ?? 'false').toLowerCase() === 'true',

  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',
  githubEndpoint: process.env.GITHUB_ENDPOINT ?? 'https://api.github.com/graphql',
  canModifyBoard: (process.env.GITHUB_PROJECT_JOB_CAN_MODIFY_GITHUB_BOARD ?? 'false').toLowerCase() === 'true',

  projectBoardConfluenceMappings: JSON.parse(process.env.GITHUB_PROJECT_TO_PAGE_MAPPINGS ?? '{}'),

  // Note: AWS-specific config is handled separately within the lambda bootstrap
}

export class Config {
  public boardToPageMappings: Readonly<{ [key: string]: Readonly<ConfluencePageDetails> }>

  public confluenceApiConfig: Readonly<AtlassianApiConfig>
  public githubApiConfig: Readonly<GithubApiConfig>

  constructor(overrides: Partial<RawConfig> = {}) {
    const result = { ...configFromEnvironment, ...overrides }
    this.boardToPageMappings = result.projectBoardConfluenceMappings
    this.confluenceApiConfig = {
      readOnly: !result.canModifyConfluence,
      userEmail: result.atlassianEmail,
      apiToken: result.atlassianApiToken,
      atlassianBaseUrl: result.atlassianBaseUrl,
      atlasBaseUrl: result.atlasBaseUrl,
    }
    this.githubApiConfig = {
      readOnly: !result.canModifyBoard,
      apiToken: result.githubToken,
      orgName: result.githubOrgName,
      endpoint: result.githubEndpoint,
    }
  }
}
