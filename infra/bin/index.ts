import { App } from 'aws-cdk-lib/core'
import { ProjectWatcherStack } from '../lib/project-watcher'

const WorkIntegrationsAccount = '381491894561'
const Ireland = 'eu-west-1'
const env = { account: WorkIntegrationsAccount, region: Ireland }

const app = new App()
new ProjectWatcherStack(app, env)
