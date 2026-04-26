import * as v from 'valibot'

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

const stringIdentifier = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.digits(),
  v.guard((it): it is `${number}` => true),
)
const PageSingleSchema = v.object({
  id: stringIdentifier,
  title: v.pipe(v.string(), v.nonEmpty()),
  status: v.picklist(['current', 'archived', 'trashed', 'deleted', 'historical', 'draft']),
  spaceId: stringIdentifier,
  version: v.object({
    number: v.number(),
    message: v.string(),
    authorId: v.pipe(v.string(), v.hexadecimal()),
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
  }),
  _links: v.looseObject({
    webui: v.pipe(v.string(), v.startsWith('/')),
    tinyui: v.pipe(v.string(), v.startsWith('/x/')),
    base: v.pipe(v.string(), v.url(), v.startsWith('https://')),
  }),
})
type PageSingle = v.InferOutput<typeof PageSingleSchema>

export async function fetchPageContents(apiConfig: AtlassianApiConfig, pageId: `${number}`): Promise<PageSingle> {
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
  return v.parse(PageSingleSchema, await response.json())
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

  const responseBody = v.parse(PageSingleSchema, await updateResponse.json())
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
