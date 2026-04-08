import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { main } from '.'
import { Config, config } from './config'

interface SecretsPayload {
  atlassianBaseUrl: string
  atlasBaseUrl: string
  atlassianEmail: string
  atlassianApiToken: string
  githubToken: string
  githubOrgName: string
}

const s3 = new S3Client({ region: config.awsRegion })

export const handler = async (): Promise<void> => {
  const secretsFile = await s3.send(new GetObjectCommand({ Bucket: config.lambdaCredentialsBucketName, Key: config.lambdaCredentialsFilePath }))
  const secrets = JSON.parse((await secretsFile.Body?.transformToString()) ?? '{}') as SecretsPayload

  const cfg: Config = {
    ...config,
    atlassianBaseUrl: secrets.atlassianBaseUrl,
    atlasBaseUrl: secrets.atlasBaseUrl,
    username: secrets.atlassianEmail,
    password: secrets.atlassianApiToken,
    githubToken: secrets.githubToken,
    githubOrgName: secrets.githubOrgName,
  }
  return main(cfg)
}
