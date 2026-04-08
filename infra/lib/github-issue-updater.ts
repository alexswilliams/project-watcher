import { aws_lambda as lambda } from 'aws-cdk-lib'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, LogGroupClass, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Schedule, ScheduleExpression } from 'aws-cdk-lib/aws-scheduler'
import { LambdaInvoke } from 'aws-cdk-lib/aws-scheduler-targets'
import { Duration, Environment, RemovalPolicy, Stack, TimeZone } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import path from 'path'
import { GithubCommonStack } from './github-common'

export class GithubIssueUpdaterStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>, commonStack: GithubCommonStack) {
    super(scope, `GithubIssueUpdaterStack`, { env })
    const lambdaRole = new Role(this, 'LambdaRole', { assumedBy: new ServicePrincipal('lambda.amazonaws.com') })
    const schedulerRole = new Role(this, 'SchedulerRole', { assumedBy: new ServicePrincipal('scheduler.amazonaws.com') })

    // Custom encryption keys and Secrets are very expensive in AWS.  So instead, store the credentals in a bucket encrypted with the account key
    commonStack.grantReadOnCredentialsFile(lambdaRole)

    const logGroup = new LogGroup(this, 'LogGroup', {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupClass: LogGroupClass.INFREQUENT_ACCESS,
      logGroupName: 'ScraperFunctionLogs',
    })
    logGroup.grantWrite(lambdaRole)

    const fn = new NodejsFunction(this, 'Function', {
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', '..', 'src', 'github-issue-updater', 'lambda.ts'),
      role: lambdaRole,
      timeout: Duration.seconds(30),
      logGroup: logGroup,
      environment: {
        GITHUB_PROJECT_JOB_CAN_MODIFY_CONFLUENCE: 'true',
        GITHUB_PROJECT_JOB_CAN_MODIFY_GITHUB_BOARD: 'true',
        GITHUB_PROJECT_TO_PAGE_MAPPINGS: JSON.stringify({
          '205': {
            pageId: '231453462',
            goalsUid: '482aaeaf-142c-416b-a7cd-eb6228de1505',
            weeklyUid: '4ceae4f5-6037-413a-b266-6222debaeb32',
          },
        }),
        CONFLUENCE_SPACE_NAME: 'ENG',
        LAMBDA_CREDENTIALS_BUCKET_NAME: commonStack.credentialBucketName(),
        LAMBDA_CREDENTIALS_FILE_PATH: commonStack.credentialsFilePath,
        // AWS_REGION: this.region, // predefined by lambda runtime
      },
    })

    new Schedule(this, 'InvocationSchedule', {
      enabled: true,
      schedule: ScheduleExpression.cron({ minute: '3', timeZone: TimeZone.EUROPE_LONDON }),
      target: new LambdaInvoke(fn, { retryAttempts: 0, role: schedulerRole, deadLetterQueue: commonStack.deadLetterQueue }),
      description: 'Invokes the Github Issue Updater lambda to update ticket metadata on github boards.',
    })
  }
}
