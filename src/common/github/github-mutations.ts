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
interface GHSetSingleSelectOptionMutationResponse {
  updateProjectV2ItemFieldValue: { projectV2Item: { id: string } }
}
export async function setSingleOptionField(
  apiConfig: GithubApiConfig,
  projectId: string,
  statusFieldId: string,
  itemId: string,
  newValue: string,
): Promise<void> {
  const result = await mutateGithubGraphQl<GHSetSingleSelectOptionMutationResponse>(
    apiConfig,
    setSingleOptionMutation,
    {
      projectId,
      statusFieldId,
      itemId,
      newValue,
    },
    () => ({
      updateProjectV2ItemFieldValue: {
        projectV2Item: {
          id: itemId,
        },
      },
    }),
  )
  if (result.data.updateProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.data.updateProjectV2ItemFieldValue)
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
interface GHSetFieldTextMutationResponse {
  updateProjectV2ItemFieldValue: { projectV2Item: { id: string } }
}
export async function setFieldText(apiConfig: GithubApiConfig, projectId: string, fieldId: string, itemId: string, newValue: string): Promise<void> {
  const result = await mutateGithubGraphQl<GHSetFieldTextMutationResponse>(
    apiConfig,
    setFieldTextIssueMutation,
    {
      projectId,
      fieldId,
      itemId,
      newValue,
    },
    () => ({
      updateProjectV2ItemFieldValue: {
        projectV2Item: {
          id: itemId,
        },
      },
    }),
  )
  if (result.data.updateProjectV2ItemFieldValue.projectV2Item.id !== itemId) {
    console.error('Unexpected ID: ', result.data.updateProjectV2ItemFieldValue)
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
interface GHArchiveIssueMutationResponse {
  archiveProjectV2Item: {
    item: {
      id: string
      isArchived: boolean
    }
  }
}
export async function archiveIssue(apiConfig: GithubApiConfig, projectId: string, itemId: string): Promise<void> {
  const result = await mutateGithubGraphQl<GHArchiveIssueMutationResponse>(
    apiConfig,
    archiveIssueMutation,
    {
      projectId: projectId,
      itemId: itemId,
    },
    () => ({
      archiveProjectV2Item: {
        item: {
          id: itemId,
          isArchived: true,
        },
      },
    }),
  )
  if (result.data.archiveProjectV2Item.item.id !== itemId || result.data.archiveProjectV2Item.item.isArchived === false) {
    console.error('Unexpected result when archiving: ', result.data.archiveProjectV2Item)
    throw Error('Unpexted result returned when archiving ' + itemId)
  }
}
