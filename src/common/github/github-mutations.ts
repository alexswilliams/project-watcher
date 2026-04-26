import * as v from 'valibot'
import { GithubApiConfig, mutateGithubGraphQl } from './raw-api'

const graphql = String.raw

const setSingleOptionMutation = graphql`
  mutation SetSingleSelectOption($projectId: ID!, $statusFieldId: ID!, $itemId: ID!, $newValue: String!) {
    updateProjectV2ItemFieldValue(
      input: { projectId: $projectId, itemId: $itemId, fieldId: $statusFieldId, value: { singleSelectOptionId: $newValue } }
    ) {
      projectV2Item {
        id
      }
    }
  }
`
const GHSetSingleSelectOptionMutationResponseSchema = v.object({
  updateProjectV2ItemFieldValue: v.object({ projectV2Item: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }) }),
})

export async function setSingleOptionField(
  apiConfig: GithubApiConfig,
  projectId: string,
  statusFieldId: string,
  itemId: string,
  newValue: string,
): Promise<void> {
  const result = await mutateGithubGraphQl(
    apiConfig,
    setSingleOptionMutation,
    {
      projectId,
      statusFieldId,
      itemId,
      newValue,
    },
    GHSetSingleSelectOptionMutationResponseSchema,
    () => ({
      updateProjectV2ItemFieldValue: {
        projectV2Item: {
          id: itemId,
        },
      },
    }),
  )
  if (result.updateProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.updateProjectV2ItemFieldValue)
    throw Error('Unpexted ID returned when updating status of ' + itemId)
  }
}

const setFieldTextIssueMutation = graphql`
  mutation SetFieldText($projectId: ID!, $fieldId: ID!, $itemId: ID!, $newValue: String!) {
    updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { text: $newValue } }) {
      projectV2Item {
        id
      }
    }
  }
`
const GHSetFieldTextMutationResponseSchema = v.object({
  updateProjectV2ItemFieldValue: v.object({ projectV2Item: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }) }),
})
export async function setFieldText(apiConfig: GithubApiConfig, projectId: string, fieldId: string, itemId: string, newValue: string): Promise<void> {
  const result = await mutateGithubGraphQl(
    apiConfig,
    setFieldTextIssueMutation,
    {
      projectId,
      fieldId,
      itemId,
      newValue,
    },
    GHSetFieldTextMutationResponseSchema,
    () => ({
      updateProjectV2ItemFieldValue: {
        projectV2Item: {
          id: itemId,
        },
      },
    }),
  )
  if (result.updateProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.updateProjectV2ItemFieldValue)
    throw Error('Unpexted ID returned when updating field value of ' + itemId)
  }
}

const archiveIssueMutation = graphql`
  mutation ArchiveIssue($projectId: ID!, $itemId: ID!) {
    archiveProjectV2Item(input: { projectId: $projectId, itemId: $itemId }) {
      item {
        id
        isArchived
      }
    }
  }
`

const GHArchiveIssueMutationResponseSchema = v.object({
  archiveProjectV2Item: v.object({
    item: v.object({
      id: v.pipe(v.string(), v.nonEmpty()),
      isArchived: v.boolean(),
    }),
  }),
})
export async function archiveIssue(apiConfig: GithubApiConfig, projectId: string, itemId: string): Promise<void> {
  const result = await mutateGithubGraphQl(
    apiConfig,
    archiveIssueMutation,
    {
      projectId: projectId,
      itemId: itemId,
    },
    GHArchiveIssueMutationResponseSchema,
    () => ({
      archiveProjectV2Item: {
        item: {
          id: itemId,
          isArchived: true,
        },
      },
    }),
  )
  if (result.archiveProjectV2Item.item.id !== itemId || result.archiveProjectV2Item.item.isArchived === false) {
    console.error('Unexpected result when archiving: ', result.archiveProjectV2Item)
    throw Error('Unpexted result returned when archiving ' + itemId)
  }
}
