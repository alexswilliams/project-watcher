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

export async function queryGithubGraphQl<TReturnBody>(
  token: string,
  query: string,
  variables: Record<string, any>,
  endpoint: string = 'https://api.github.com/graphql',
): Promise<GHQueryResponse<TReturnBody>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'Accept: application/vnd.github+json',
      Authorization: 'Bearer ' + token,
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
  token: string,
  query: string,
  variables: Record<string, unknown>,
  consumePage: (payload: TReturnBody) => Record<string, unknown> | null, // return record to merge into variables in order to request next page; or null to finish here
  pageSize: number = 100,
  endpoint: string = 'https://api.github.com/graphql',
): Promise<void> {
  let nextPage: Record<string, unknown> | null = {}
  do {
    const responseBody = await queryGithubGraphQl<TReturnBody>(token, query, { ...variables, ...nextPage, pageSize }, endpoint)
    nextPage = consumePage(responseBody.data)
  } while (nextPage !== null)
}
