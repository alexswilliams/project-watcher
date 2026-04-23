import { describe, expect, test } from 'vitest'
import { _forTesting } from './confluence-renderer'

const jiraBase = 'https://example.org/jira'
const atlasBase = 'https://example.org/atlas'

describe('Confluence Page Renderer', () => {
  describe('Link Rendering', () => {
    test.each([
      {
        input: { jira: 'BLAH-123', atlas: 'BOOPCAT-345' },
        expectedOutput:
          '<a href="https://example.org/jira/browse/BLAH-123">BLAH-123</a>, <a href="https://example.org/atlas/project/BOOPCAT-345">BOOPCAT-345</a>',
      },
      {
        input: { jira: 'BLAH-123', atlas: null },
        expectedOutput: '<a href="https://example.org/jira/browse/BLAH-123">BLAH-123</a>',
      },
      {
        input: { jira: null, atlas: 'BOOPCAT-345' },
        expectedOutput: '<a href="https://example.org/atlas/project/BOOPCAT-345">BOOPCAT-345</a>',
      },
      {
        input: { jira: null, atlas: null },
        expectedOutput: null,
      },
    ])('Testing $input', scenario => {
      expect(_forTesting.renderLinkPair(jiraBase, atlasBase, scenario.input.jira, scenario.input.atlas)).toEqual(scenario.expectedOutput)
    })
  })

  describe('Project Rendering', () => {
    test.each([
      {
        input: { links: '<a href="https://example.org">BLAH-123</a>', projectName: 'Simple Project' },
        expectedOutput: '<a href="https://example.org">BLAH-123</a>: Simple Project',
      },
      {
        input: { links: null, projectName: 'Simple Project' },
        expectedOutput: 'Simple Project',
      },
      {
        input: { links: null, projectName: 'Project & Title' },
        expectedOutput: 'Project &amp; Title',
      },
    ])('Testing $input', scenario => {
      expect(_forTesting.renderProjectNameLine(scenario.input.links, scenario.input.projectName)).toEqual(scenario.expectedOutput)
    })
  })

  describe('Section Title Rendering', () => {
    test.each([
      {
        input: { projectName: 'Simple Project', sectionTitle: 'Section', links: '<a href="https://example.org">BLAH-123</a>' },
        expectedOutput: 'Section - Simple Project: <a href="https://example.org">BLAH-123</a>',
      },
      {
        input: { projectName: 'Simple Project', sectionTitle: 'Section', links: null },
        expectedOutput: 'Section - Simple Project',
      },
      {
        input: { projectName: 'Symbol & < > Project', sectionTitle: 'Section & Other Section', links: '<a href="https://example.org">BLAH-123</a>' },
        expectedOutput: 'Section &amp; Other Section - Symbol &amp; &lt; &gt; Project: <a href="https://example.org">BLAH-123</a>',
      },
    ])('Testing $input', scenario => {
      expect(_forTesting.renderSectionTitle(scenario.input.sectionTitle, scenario.input.projectName, scenario.input.links)).toEqual(
        scenario.expectedOutput,
      )
    })
  })
})
