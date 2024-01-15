import { Handler } from 'aws-lambda/handler'
import { main } from '.'
import { Config, config } from './config'
import { getSecret } from '@aws-lambda-powertools/parameters/secrets'

interface SecretsPayload {
  atlassianBaseUrl: string
  atlassianEmail: string
  atlassianApiToken: string
  githubToken: string
}

export const handler: Handler = async () => {
  const secrets = JSON.parse((await getSecret(config.lambdaSecretName)) ?? '{}') as SecretsPayload
  const cfg: Config = {
    ...config,
    atlassianBaseUrl: secrets.atlassianBaseUrl,
    username: secrets.atlassianEmail,
    password: secrets.atlassianApiToken,
    githubToken: secrets.githubToken,
  }
  await main(cfg)
}
