import { describe, expect, test } from 'vitest'
import { projectNameToHeadingData } from './parsers'
describe('Project Name Parser', () => {
  describe('Success cases', () => {
    test.each([
      {
        input: 'Project Name',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'BLAH-123' },
      },
      {
        input: 'BOOPLING-12',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'BOOPLING-12' },
      },
      {
        input: 'BOOPLING-12, BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'BOOPLING-12, BLAH-123' },
      },
      {
        input: 'Project Name:BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name:BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name : BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: BLAH-123,BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name:BLAH-123,BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: BOOPLING-12',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name:BOOPLING-12',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: BOOPLING-12, BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name:BOOPLING-12,BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name- BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name - BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name - BOOPLING-12',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name- BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name - BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name - BOOPLING-12, BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
    ])('Testing $input', scenario => {
      expect(projectNameToHeadingData(scenario.input)).toEqual(scenario.expectedOutput)
    })
  })
  describe('Edge cases', () => {
    test.each([
      {
        input: 'Project Name:',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name: ',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name- ',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: 'Project Name' },
      },
      {
        input: 'Project Name-',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: 'Project Name-' },
      },
      {
        input: ':Project Name',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: ':Project Name' },
      },
      {
        input: ': Project Name',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: ': Project Name' },
      },
      {
        input: ': BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: ': BLAH-123' },
      },
      {
        input: ': BLAH-123: Project Name',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: ': BLAH-123' },
      },
    ])('Testing $input', scenario => {
      expect(projectNameToHeadingData(scenario.input)).toEqual(scenario.expectedOutput)
    })
  })
})
