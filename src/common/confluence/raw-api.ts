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
    authorId: string // hex string
    createdAt: string
  }
  _links: {
    webui: `/${string}`
    tinyui: `/x/${string}`
    base: `https://${string}`
  }
}
export async function fetchPageContents(
  pageId: `${number}`,
  userEmail: string,
  apiToken: string,
  atlassianBaseUrl: string,
): Promise<ConfluencePageSingle> {
  const pageUrl = `${atlassianBaseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`
  const response = await fetch(pageUrl, {
    method: 'GET',
    headers: generateHeaders(userEmail, apiToken),
  })

  if (!response.ok) {
    const errorBody = (await response.json()) as ConfluenceErrorResponse
    console.error('Could not find page.\n', errorBody)
    throw Error('Could not find page: ' + errorBody.message)
  }
  const responseBody = await response.json()
  console.log(responseBody)
  return responseBody as ConfluencePageSingle
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
  pageId: `${number}`,
  userEmail: string,
  apiToken: string,
  atlassianBaseUrl: string,
  title: string,
  currentVersion: number,
  body: string,
  execute: boolean,
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

  const pageUrl = `${atlassianBaseUrl}/wiki/api/v2/pages/${pageId}`
  if (!execute) {
    console.info('Would have uploaded to confluence: ', pageUrl, JSON.stringify(requestPayload, undefined, 2))
    return 'https://example.org'
  }
  const updateResponse = await fetch(pageUrl, {
    method: 'PUT',
    headers: generateHeaders(userEmail, apiToken, true),
    body: JSON.stringify(requestPayload),
  })

  if (!updateResponse.ok) {
    const errorBody = (await updateResponse.json()) as ConfluenceErrorResponse
    console.error('Could not post update to page\n', errorBody)
    throw Error('Could not post update: ' + errorBody.message)
  }

  const responseBody = (await updateResponse.json()) as ConfluencePageSingle
  return responseBody._links.base + responseBody._links.webui
}

function generateRequestToken(userEmail: string, apiToken: string) {
  return Buffer.from(userEmail + ':' + apiToken).toString('base64')
}

function generateHeaders(userEmail: string, apiToken: string, hasBody: boolean = false): import('undici-types').HeadersInit | undefined {
  return {
    Accept: 'application/json',
    Authorization: 'Basic ' + generateRequestToken(userEmail, apiToken),
    'User-Agent': 'Github to Confluence Reporter',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  }
}
