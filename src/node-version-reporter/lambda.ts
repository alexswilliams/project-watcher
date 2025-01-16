import { Handler } from 'aws-lambda/handler'

export const handler: Handler = async () => {
  const response = {
    statusCode: 200,
    body: JSON.stringify('Version: ' + process.versions.node),
  }
  console.info(response)
  return response
}
