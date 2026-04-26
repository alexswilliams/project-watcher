export interface AtlassianApiConfig {
  readOnly: boolean
  userEmail: string
  apiToken: string
  atlassianBaseUrl: string
  atlasBaseUrl: string
}

interface ConfluenceErrorResponse {
  statusCode: number
  data: {
    authorized: boolean
    valid: boolean
    errors: Array<{
      message: {
        translation: string
        args: Array<unknown>
      }
    }>
    successful: boolean
  }
  message: string
}

interface ConfluencePageSingle {
  id: `${number}`
  title: string
  status: `current` | `archived` | `trashed` | `deleted` | `historical` | `draft`
  spaceId: `${number}`
  version: {
    number: number
    message: string
    authorId: string // hex string
    createdAt: string
  }
  _links: {
    webui: `/${string}`
    tinyui: `/x/${string}`
    base: `https://${string}`
  }
}
export async function fetchPageContents(apiConfig: AtlassianApiConfig, pageId: `${number}`): Promise<ConfluencePageSingle> {
  const pageUrl = `${apiConfig.atlassianBaseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`
  const response = await fetch(pageUrl, {
    method: 'GET',
    headers: generateHeaders(apiConfig),
  })

  if (!response.ok) {
    console.error('Could not find page.  Attempting to resolve error response...', response.status, response.statusText)
    const errorBody = (await response.json()) as ConfluenceErrorResponse
    console.error('Could not find page.\n', errorBody)
    throw Error('Could not find page: ' + errorBody.message)
  }
  const responseBody = (await response.json()) as ConfluencePageSingle
  return responseBody
}

interface ConfluencePageEditRequest {
  id: `${number}`
  status: `current` | `draft`
  title: string
  spaceId?: `${number}`
  parentId?: `${number}`
  body: {
    representation: `storage` | `atlas_doc_format` | `wiki`
    value: string
  }
  version: {
    number: number
    message: string
  }
}
export async function updatePage(
  apiConfig: AtlassianApiConfig,
  pageId: `${number}`,
  title: string,
  currentVersion: number,
  body: string,
): Promise<string> {
  const requestPayload = {
    id: pageId,
    title: title,
    status: 'current',
    body: {
      representation: 'storage',
      value: body,
    },
    version: {
      number: currentVersion + 1,
      message: 'Update from script',
    },
  } as ConfluencePageEditRequest

  const pageUrl = `${apiConfig.atlassianBaseUrl}/wiki/api/v2/pages/${pageId}`
  if (apiConfig.readOnly) {
    console.info('Would have uploaded to confluence: ', pageUrl, JSON.stringify(requestPayload, undefined, 2))
    return 'https://example.org'
  }
  const updateResponse = await fetch(pageUrl, {
    method: 'PUT',
    headers: generateHeaders(apiConfig, true),
    body: JSON.stringify(requestPayload),
  })

  if (!updateResponse.ok) {
    console.error('Could not update page.  Attempting to resolve error response...', updateResponse.status, updateResponse.statusText)
    const errorBody = (await updateResponse.json()) as ConfluenceErrorResponse
    console.error('Could not post update to page\n', errorBody)
    throw Error('Could not update page: ' + errorBody.message)
  }

  const responseBody = (await updateResponse.json()) as ConfluencePageSingle
  return responseBody._links.base + responseBody._links.webui
}

function generateRequestToken(userEmail: string, apiToken: string) {
  return Buffer.from(userEmail + ':' + apiToken).toString('base64')
}

function generateHeaders(apiConfig: AtlassianApiConfig, hasBody: boolean = false): import('undici-types').HeadersInit | undefined {
  return {
    Accept: 'application/json',
    Authorization: 'Basic ' + generateRequestToken(apiConfig.userEmail, apiConfig.apiToken),
    'User-Agent': 'Github to Confluence Reporter',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  }
}
