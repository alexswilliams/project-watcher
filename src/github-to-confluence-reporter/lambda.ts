import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import * as v from 'valibot'
import { main } from '.'
import { Config, SecretsSchema } from './config'

const awsConfig = {
  lambdaCredentialsBucketName: process.env.LAMBDA_CREDENTIALS_BUCKET_NAME ?? '',
  lambdaCredentialsFilePath: process.env.LAMBDA_CREDENTIALS_FILE_PATH ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
}

v.is(
  v.object({
    lambdaCredentialsBucketName: v.pipe(v.string(), v.trim(), v.nonEmpty()),
    lambdaCredentialsFilePath: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.endsWith('.json')),
    awsRegion: v.pipe(v.string(), v.regex(/^[a-z]{2}-[a-z]+[0-9]+$/), v.toLowerCase()),
  }),
  awsConfig,
)

const s3 = new S3Client({ region: awsConfig.awsRegion })

export const handler = async (event: unknown): Promise<void> => {
  const command = new GetObjectCommand({ Bucket: awsConfig.lambdaCredentialsBucketName, Key: awsConfig.lambdaCredentialsFilePath })
  const secretsFile = await s3.send(command)
  const secrets = v.parse(SecretsSchema, await secretsFile.Body?.transformToString())

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
