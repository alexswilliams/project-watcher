import { App } from 'aws-cdk-lib/core'
import { ProjectWatcherStack } from '../lib/project-watcher'
import { CrossAccountAccessRoleStack } from '../lib/access-role'
import { NodeVersionReporterStack } from '../lib/node-version-reporter'

const WorkIntegrationsAccount = '381491894561'
const Ireland = 'eu-west-1'
const env = { account: WorkIntegrationsAccount, region: Ireland }

const app = new App()

new CrossAccountAccessRoleStack(app, env, '376688029101', 'WorkIntegrations')
new ProjectWatcherStack(app, env)
new NodeVersionReporterStack(app, env)
