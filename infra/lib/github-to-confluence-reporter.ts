import { aws_lambda as lambda } from 'aws-cdk-lib'
import { Weekday } from 'aws-cdk-lib/aws-fsx'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, LogGroupClass, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Schedule, ScheduleExpression } from 'aws-cdk-lib/aws-scheduler'
import { LambdaInvoke } from 'aws-cdk-lib/aws-scheduler-targets'
import { Duration, Environment, RemovalPolicy, Stack, TimeZone } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import path from 'path'
import { GithubCommonStack } from './github-common'

export class GithubToConfluenceReporterStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>, commonStack: GithubCommonStack) {
    super(scope, `GithubToConfluenceReporterStack`, { env })
    const lambdaRole = new Role(this, 'LambdaRole', { assumedBy: new ServicePrincipal('lambda.amazonaws.com') })
    const schedulerRole = new Role(this, 'SchedulerRole', { assumedBy: new ServicePrincipal('scheduler.amazonaws.com') })

    // This costs $1/month!  The default account key costs nothing :)
    // const encryptionKey = new Key(this, 'CredentialsKMSKey', {
    //   alias: 'CredentialsKey',
    //   enabled: true,
    // })
    // encryptionKey.grantDecrypt(role)

    // This costs 40¢/month
    // const secrets = new Secret(this, 'Credentials', {
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   secretName: 'Credentials',
    //   encryptionKey: encryptionKey,
    // })
    // secrets.grantRead(role)

    // So instead, store the credentals in a bucket encrypted with the account key
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
      entry: path.join(__dirname, '..', '..', 'src', 'github-to-confluence-reporter', 'lambda.ts'),
      role: lambdaRole,
      timeout: Duration.seconds(30),
      logGroup: logGroup,
      environment: {
        CAN_MODIFY_CONFLUENCE: 'true',
        CAN_MODIFY_GITHUB_BOARD: 'true',
        GITHUB_PROJECT_TO_PAGE_MAPPINGS: JSON.stringify({
          '205': {
            pageId: '231453462',
            goalsUid: '482aaeaf-142c-416b-a7cd-eb6228de1505',
            weeklyUid: '4ceae4f5-6037-413a-b266-6222debaeb32',
          },
        }),
        LAMBDA_CREDENTIALS_BUCKET_NAME: commonStack.credentialBucketName(),
        LAMBDA_CREDENTIALS_FILE_PATH: commonStack.credentialsFilePath,
        // AWS_REGION: this.region, // predefined by lambda runtime
      },
    })

    new Schedule(this, 'InvocationSchedule', {
      enabled: true,
      schedule: ScheduleExpression.cron({ hour: '17', minute: '46', weekDay: Weekday.TUESDAY, timeZone: TimeZone.EUROPE_LONDON }),
      target: new LambdaInvoke(fn, { retryAttempts: 0, role: schedulerRole, deadLetterQueue: commonStack.deadLetterQueue }),
      description: 'Invokes the Github->Confluence Reporter lambda to issue summaries into confluence and mark reported issues.',
    })
  }
}
