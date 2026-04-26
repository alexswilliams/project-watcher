export interface GithubApiConfig {
  readOnly: boolean
  apiToken: string
  orgName: string
  endpoint: string
}

export interface GHQueryResponse<T> {
  data: T
  errors?: Array<GHQueryErrorResponse>
}
export interface GHQueryErrorResponse {
  type: string
  path: Array<string>
  locations: Array<{ line: number; column: number }>
  message: string
}

export async function mutateGithubGraphQl<TReturnBody>(
  apiConfig: GithubApiConfig,
  query: string,
  variables: Record<string, any>,
  responseIfReadOnly: () => TReturnBody,
): Promise<GHQueryResponse<TReturnBody>> {
  if (apiConfig.readOnly) {
    console.info('Would have made mutation: ', JSON.stringify({ query, variables }))
    return { data: responseIfReadOnly() }
  }
  throw Error('should be read-only')
  return queryGithubGraphQl(apiConfig, query, variables)
}

export async function queryGithubGraphQl<TReturnBody>(
  apiConfig: GithubApiConfig,
  query: string,
  variables: Record<string, any>,
): Promise<GHQueryResponse<TReturnBody>> {
  const response = await fetch(apiConfig.endpoint, {
    method: 'POST',
    headers: {
      Accept: 'Accept: application/vnd.github+json',
      Authorization: 'Bearer ' + apiConfig.apiToken,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!response.ok) {
    console.error('Github response not successful', await response.text())
    throw Error(`Github response not successful: ${response.statusText}`)
  }
  const responseBody = (await response.json()) as GHQueryResponse<TReturnBody>

  if (responseBody.errors && responseBody.errors.length > 0) {
    console.error('Errors: ', responseBody.errors)
    throw Error(`Errors returned by query: ${responseBody.errors.map(it => it.message)}`)
  }
  return responseBody
}

export async function queryGithubGraphQlPaged<TReturnBody>(
  apiConfig: GithubApiConfig,
  query: string,
  variables: Record<string, unknown>,
  consumePage: (payload: TReturnBody) => Record<string, unknown> | null, // return record to merge into variables in order to request next page; or null to finish here
  pageSize: number = 100,
): Promise<void> {
  let nextPage: Record<string, unknown> | null = {}
  do {
    const responseBody = await queryGithubGraphQl<TReturnBody>(apiConfig, query, { ...variables, ...nextPage, pageSize })
    nextPage = consumePage(responseBody.data)
  } while (nextPage !== null)
}
