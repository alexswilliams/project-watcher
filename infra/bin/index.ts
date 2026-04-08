import { App } from 'aws-cdk-lib/core'
import { GithubToConfluenceReporterStack } from '../lib/github-to-confluence-reporter'
import { CrossAccountAccessRoleStack } from '../lib/access-role'
import { NodeVersionReporterStack } from '../lib/node-version-reporter'
import { GithubCommonStack } from '../lib/github-common'
import { GithubIssueUpdaterStack } from '../lib/github-issue-updater'

const WorkIntegrationsAccount = '381491894561'
const Ireland = 'eu-west-1'
const env = { account: WorkIntegrationsAccount, region: Ireland }

const app = new App()

new CrossAccountAccessRoleStack(app, env, '376688029101', 'WorkIntegrations')
new NodeVersionReporterStack(app, env)

const commonStack = new GithubCommonStack(app, env)
new GithubToConfluenceReporterStack(app, env, commonStack)
// Uncomment to have the hourly job running
// new GithubIssueUpdaterStack(app, env, commonStack)
