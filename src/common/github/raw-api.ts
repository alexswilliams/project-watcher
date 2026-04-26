import * as v from 'valibot'

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
  responseSchema: v.BaseSchema<unknown, TReturnBody, v.BaseIssue<unknown>>,
  responseIfReadOnly: () => TReturnBody,
): Promise<TReturnBody> {
  if (apiConfig.readOnly) {
    console.info('Would have made mutation: ', JSON.stringify({ query, variables }))
    return responseIfReadOnly()
  }
  return queryGithubGraphQl(apiConfig, query, variables, responseSchema)
}

export async function queryGithubGraphQl<TOutput>(
  apiConfig: GithubApiConfig,
  query: string,
  variables: Record<string, any>,
  responseSchema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>,
): Promise<v.InferOutput<typeof responseSchema>> {
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

  const json = (await response.json()) as any
  const responseBody = v.parse(responseWrapperFor(responseSchema), json, {
    abortEarly: true,
    abortPipeEarly: true,
    message: it => it.message + `\n - Failing Input: ` + JSON.stringify(it.input),
  })

  if (responseBody.errors) {
    console.error('Errors: ', responseBody.errors)
    throw Error(`Errors returned by query: ${responseBody.errors.map(it => it.message)}`)
  }
  return responseBody.data
}

function responseWrapperFor<TOutput>(responseSchema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>) {
  return v.object({
    data: responseSchema,
    errors: v.optional(
      v.array(
        v.object({
          type: v.string(),
          path: v.array(v.string()),
          locations: v.array(v.object({ line: v.number(), column: v.number() })),
          message: v.string(),
        }),
      ),
    ),
  })
}

export async function queryGithubGraphQlPaged<TReturnBody>(
  apiConfig: GithubApiConfig,
  query: string,
  variables: Record<string, unknown>,
  responseSchema: v.BaseSchema<unknown, TReturnBody, v.BaseIssue<unknown>>,
  consumePage: (payload: TReturnBody) => Record<string, unknown> | null, // return record to merge into variables in order to request next page; or null to finish here
  pageSize: number = 100,
): Promise<void> {
  let nextPage: Record<string, unknown> | null = {}
  do {
    const responseBody = await queryGithubGraphQl(apiConfig, query, { ...variables, ...nextPage, pageSize }, responseSchema)
    nextPage = consumePage(responseBody)
  } while (nextPage !== null)
}
