import { describe, expect, test } from 'vitest'
import { projectNameToHeadingData } from './parsers'
describe('Project Name Parser', () => {
  describe('Success cases', () => {
    test.each([
      {
        input: null,
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: null },
      },
      {
        input: '',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: null },
      },
      {
        input: ' ',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: null },
      },
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
        input: 'A: Project Name: BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: null, parsedProjectName: 'A: Project Name' },
      },
      {
        input: 'Project Name: BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'Project Name' },
      },
      {
        input: 'A: Project Name: BLAH-123, BOOPLING-12',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: 'A: Project Name' },
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
      {
        input: '1: Project Name - BOOPLING-12, BLAH-123',
        expectedOutput: { parsedJiraEpic: 'BLAH-123', parsedAtlasProject: 'BOOPLING-12', parsedProjectName: '1: Project Name' },
      },
      {
        input: '0: Admin Tasks',
        expectedOutput: { parsedJiraEpic: null, parsedAtlasProject: null, parsedProjectName: '0: Admin Tasks' },
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
