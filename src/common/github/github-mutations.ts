import * as v from 'valibot'
import { GithubApiConfig, mutateGithubGraphQl } from './raw-api'

const graphql = String.raw

const setSingleOptionMutation = graphql`
  mutation SetSingleSelectOption($projectId: ID!, $fieldId: ID!, $itemId: ID!, $newValue: String!) {
    updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { singleSelectOptionId: $newValue } }) {
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
  fieldId: string,
  itemId: string,
  newValue: string | null,
): Promise<void> {
  if (newValue === null) return clearField(apiConfig, projectId, fieldId, itemId)
  const result = await mutateGithubGraphQl(
    apiConfig,
    setSingleOptionMutation,
    {
      projectId,
      fieldId,
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
export async function setFieldText(
  apiConfig: GithubApiConfig,
  projectId: string,
  fieldId: string,
  itemId: string,
  newValue: string | null,
): Promise<void> {
  if (newValue === null) return clearField(apiConfig, projectId, fieldId, itemId)
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

const setFieldDateIssueMutation = graphql`
  mutation SetFieldDate($projectId: ID!, $fieldId: ID!, $itemId: ID!, $newValue: String!) {
    updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { date: $newValue } }) {
      projectV2Item {
        id
      }
    }
  }
`
const GHSetFieldDateMutationResponseSchema = v.object({
  updateProjectV2ItemFieldValue: v.object({ projectV2Item: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }) }),
})
export async function setFieldDate(
  apiConfig: GithubApiConfig,
  projectId: string,
  fieldId: string,
  itemId: string,
  newValue: string | null,
): Promise<void> {
  if (newValue === null) return clearField(apiConfig, projectId, fieldId, itemId)
  const result = await mutateGithubGraphQl(
    apiConfig,
    setFieldDateIssueMutation,
    {
      projectId,
      fieldId,
      itemId,
      newValue,
    },
    GHSetFieldDateMutationResponseSchema,
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

const clearFieldTextIssueMutation = graphql`
  mutation ClearFieldText($projectId: ID!, $fieldId: ID!, $itemId: ID!) {
    clearProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId }) {
      projectV2Item {
        id
      }
    }
  }
`
const GHClearFieldTextMutationResponseSchema = v.object({
  clearProjectV2ItemFieldValue: v.object({ projectV2Item: v.object({ id: v.pipe(v.string(), v.nonEmpty()) }) }),
})
export async function clearField(apiConfig: GithubApiConfig, projectId: string, fieldId: string, itemId: string): Promise<void> {
  const result = await mutateGithubGraphQl(
    apiConfig,
    clearFieldTextIssueMutation,
    {
      projectId,
      fieldId,
      itemId,
    },
    GHClearFieldTextMutationResponseSchema,
    () => ({
      clearProjectV2ItemFieldValue: {
        projectV2Item: {
          id: itemId,
        },
      },
    }),
  )
  if (result.clearProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.clearProjectV2ItemFieldValue)
    throw Error('Unpexted ID returned when clearing field ' + itemId)
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
