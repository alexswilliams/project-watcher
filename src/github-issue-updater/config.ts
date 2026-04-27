import * as v from 'valibot'
import { GithubApiConfig } from '../common/github/raw-api'

export const SecretsSchema = v.object({
  githubToken: v.pipe(v.string(), v.startsWith('github_pat_')),
  githubOrgName: v.pipe(v.string(), v.nonEmpty()),
})

const RawConfigSchema = v.object({
  ...SecretsSchema.entries,

  githubEndpoint: v.pipe(v.string(), v.url()),
  canModifyBoard: v.boolean(),
  boardNumber: v.pipe(v.number(), v.minValue(1)),
})

const configFromEnvironment: v.InferOutput<typeof RawConfigSchema> = {
  githubToken: process.env.GITHUB_PROJECTS_TOKEN ?? '',
  githubOrgName: process.env.GITHUB_ORG_NAME ?? '',
  githubEndpoint: process.env.GITHUB_ENDPOINT ?? 'https://api.github.com/graphql',
  canModifyBoard: (process.env.CAN_MODIFY_GITHUB_BOARD ?? 'false').toLowerCase() === 'true',
  boardNumber: Number(process.env.GITHUB_BOARD_NUMBER ?? '-1'),

  // Note: AWS-specific config is handled separately within the lambda bootstrap
}

export class Config {
  public readonly boardNumber: number
  public readonly githubApiConfig: Readonly<GithubApiConfig>

  constructor(overrides: Partial<v.InferOutput<typeof RawConfigSchema>> = {}) {
    const result = { ...configFromEnvironment, ...overrides }

    v.is(RawConfigSchema, result)

    this.boardNumber = result.boardNumber
    this.githubApiConfig = {
      readOnly: !result.canModifyBoard,
      apiToken: result.githubToken,
      orgName: result.githubOrgName,
      endpoint: result.githubEndpoint,
    }
  }
}
