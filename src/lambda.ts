import { Handler } from 'aws-lambda/handler'
import { main } from '.'
import { Config, config } from './config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

interface SecretsPayload {
  atlassianBaseUrl: string
  atlassianEmail: string
  atlassianApiToken: string
  githubToken: string
  githubOrgName: string
}

export const handler: Handler = async () => {
  const s3 = new S3Client({ region: config.awsRegion })
  const secretsFile = await s3.send(new GetObjectCommand({ Bucket: config.lambdaCredentialsBucketName, Key: config.lambdaCredentialsFilePath }))
  const secrets = JSON.parse((await secretsFile.Body?.transformToString()) ?? '{}') as SecretsPayload

  const cfg: Config = {
    ...config,
    atlassianBaseUrl: secrets.atlassianBaseUrl,
    username: secrets.atlassianEmail,
    password: secrets.atlassianApiToken,
    githubToken: secrets.githubToken,
    githubOrgName: secrets.githubOrgName,
  }
  await main(cfg)
}
