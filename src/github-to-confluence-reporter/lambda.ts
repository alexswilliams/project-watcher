import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { main } from '.'
import { Config } from './config'

const awsConfig = {
  lambdaCredentialsBucketName: process.env.LAMBDA_CREDENTIALS_BUCKET_NAME ?? '',
  lambdaCredentialsFilePath: process.env.LAMBDA_CREDENTIALS_FILE_PATH ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
}

interface SecretsPayload {
  atlassianBaseUrl: string
  atlasBaseUrl: string
  atlassianEmail: string
  atlassianApiToken: string
  githubToken: string
  githubOrgName: string
}

const s3 = new S3Client({ region: awsConfig.awsRegion })

export const handler = async (event: unknown): Promise<void> => {
  const command = new GetObjectCommand({ Bucket: awsConfig.lambdaCredentialsBucketName, Key: awsConfig.lambdaCredentialsFilePath })
  const secretsFile = await s3.send(command)
  const secrets = JSON.parse((await secretsFile.Body?.transformToString()) ?? '{}') as SecretsPayload

  const configWithOverrides = new Config({
    atlassianBaseUrl: secrets.atlassianBaseUrl,
    atlasBaseUrl: secrets.atlasBaseUrl,
    atlassianEmail: secrets.atlassianEmail,
    atlassianApiToken: secrets.atlassianApiToken,
    githubToken: secrets.githubToken,
    githubOrgName: secrets.githubOrgName,
  })

  return main(configWithOverrides)
}
