import * as v from 'valibot'
import { AtlassianApiConfig } from '../common/confluence/raw-api'
import { GithubApiConfig } from '../common/github/raw-api'

export const SecretsSchema = v.object({
  atlassianBaseUrl: v.pipe(v.string(), v.url(), v.regex(/^https:\/\/[a-z-]+\.atlassian\.net$/)),
  atlasBaseUrl: v.pipe(v.string(), v.url(), v.regex(/^https:\/\/home\.atlassian\.com\/o\/[0-9a-f-]{36}\/s\/[0-9a-f-]{36}$/)),
  atlassianEmail: v.pipe(v.string(), v.email()),
  atlassianApiToken: v.pipe(v.string(), v.startsWith('ATAT')),

  githubToken: v.pipe(v.string(), v.startsWith('github_pat_')),
  githubOrgName: v.pipe(v.string(), v.nonEmpty()),
})

const ConfluencePageDetailsSchema = v.object({
  pageId: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.digits(),
    v.transform(it => it as `${number}`),
  ),
  goalsUid: v.pipe(v.string(), v.uuid()),
  weeklyUid: v.pipe(v.string(), v.uuid()),
})
export type ConfluencePageDetails = v.InferOutput<typeof ConfluencePageDetailsSchema>

const ProjectBoardMappingSchema = v.record(v.pipe(v.string(), v.nonEmpty(), v.digits()), ConfluencePageDetailsSchema)

const RawConfigSchema = v.object({
  ...SecretsSchema.entries,

  githubEndpoint: v.pipe(v.string(), v.url()),
  canModifyConfluence: v.boolean(),
  canModifyBoard: v.boolean(),

  projectBoardConfluenceMappings: ProjectBoardMappingSchema,
})

const configFromEnvironment: v.InferOutput<typeof RawConfigSchema> = {
  atlassianBaseUrl: process.env.ATLASSIAN_BASE_URL ?? '',
  atlasBaseUrl: process.env.ATLAS_BASE_URL ?? '',
  atlassianEmail: process.env.ATLASSIAN_EMAIL ?? '',
  atlassianApiToken: process.env.ATLASSIAN_API_TOKEN ?? '',
  canModifyConfluence: (process.env.CAN_MODIFY_CONFLUENCE ?? 'false').toLowerCase() === 'true',

  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',
  githubEndpoint: process.env.GITHUB_ENDPOINT ?? 'https://api.github.com/graphql',
  canModifyBoard: (process.env.CAN_MODIFY_GITHUB_BOARD ?? 'false').toLowerCase() === 'true',

  projectBoardConfluenceMappings: JSON.parse(process.env.GITHUB_PROJECT_TO_PAGE_MAPPINGS ?? '{}'),

  // Note: AWS-specific config is handled separately within the lambda bootstrap
}

export class Config {
  public boardToPageMappings: v.InferOutput<typeof ProjectBoardMappingSchema>

  public confluenceApiConfig: Readonly<AtlassianApiConfig>
  public githubApiConfig: Readonly<GithubApiConfig>

  constructor(overrides: Partial<v.InferOutput<typeof RawConfigSchema>> = {}) {
    const result = { ...configFromEnvironment, ...overrides }

    v.is(RawConfigSchema, result)

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
