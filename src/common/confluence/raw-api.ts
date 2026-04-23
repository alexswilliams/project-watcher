interface ConfluenceAccountResponse {
  accountId: string
  email: string
  [propName: string]: any
}
interface ConfluenceSpaceResponse {
  id: number
  key: string
  alias: string
  name: string
  [propName: string]: any
}
interface ConfluencePageContentsResponse {
  id: string
  type: string
  title: string
  space: ConfluenceSpaceResponse
  version: {
    by: ConfluenceAccountResponse
    when: string
    number: number
    [propName: string]: any
  }
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

export async function fetchPageContents(
  pageId: string,
  userEmail: string,
  apiToken: string,
  atlassianBaseUrl: string,
): Promise<ConfluencePageContentsResponse> {
  const pageUrl = `${atlassianBaseUrl}/wiki/rest/api/content/${pageId}`
  const response = await fetch(pageUrl, {
    method: 'GET',
    headers: generateHeaders(userEmail, apiToken),
  })

  if (!response.ok) {
    const errorBody = (await response.json()) as ConfluenceErrorResponse
    console.error('Could not find page.\n', errorBody)
    throw Error('Could not find page: ' + errorBody.message)
  }
  return (await response.json()) as ConfluencePageContentsResponse
}

interface ConfluencePageEditResponse {
  id: string
  status: 'current' | 'draft' | 'archived' | 'historical' | 'trashed' | 'deleted' | 'any'
  title: string
  space: ConfluenceSpaceResponse
  container: ConfluenceSpaceResponse
  ancestors: Array<unknown>
  macroRenderedOutput: unknown
  extensions: unknown
  version: {
    by: ConfluenceAccountResponse
    when: string
    number: number
    [propName: string]: any
  }
  body: {
    storage: {
      value: string
      representation: string
      [propName: string]: any
    }
  }
  _links: {
    webui: `/${string}`
    context: `/${string}`
    tinyui: `/x/${string}`
    base: `https://${string}`
    [propName: string]: string
  }
}

export async function updatePage(
  pageId: string,
  userEmail: string,
  apiToken: string,
  atlassianBaseUrl: string,
  title: string,
  spaceKey: string,
  currentVersion: number,
  body: string,
  execute: boolean,
): Promise<string> {
  const requestPayload = JSON.stringify({
    id: pageId,
    type: 'page',
    title: title,
    space: { key: spaceKey },
    version: { number: currentVersion + 1 },
    body: {
      storage: {
        value: body,
        representation: 'storage',
      },
    },
  })

  const pageUrl = `${atlassianBaseUrl}/wiki/rest/api/content/${pageId}`
  if (!execute) {
    console.info('Would have uploaded to confluence: ', pageUrl, requestPayload)
    return 'https://example.org'
  }
  const updateResponse = await fetch(pageUrl, {
    method: 'PUT',
    headers: generateHeaders(userEmail, apiToken),
    body: requestPayload,
  })

  if (!updateResponse.ok) {
    const errorBody = (await updateResponse.json()) as ConfluenceErrorResponse
    console.error('Could not post update to page\n', errorBody)
    throw Error('Could not post update: ' + errorBody.message)
  }

  const responseBody = (await updateResponse.json()) as ConfluencePageEditResponse
  return responseBody._links.base + responseBody._links.webui
}

function generateRequestToken(userEmail: string, apiToken: string) {
  return Buffer.from(userEmail + ':' + apiToken).toString('base64')
}

function generateHeaders(userEmail: string, apiToken: string): import('undici-types').HeadersInit | undefined {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Basic ' + generateRequestToken(userEmail, apiToken),
    'User-Agent': 'Github to Confluence Reporter',
  }
}
