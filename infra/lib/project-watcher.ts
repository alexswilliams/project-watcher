import { Duration, Environment, RemovalPolicy, Stack, TimeZone } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { aws_lambda as lambda } from 'aws-cdk-lib'
import { aws_iam as iam } from 'aws-cdk-lib'
import path from 'path'
import { LogGroup, LogGroupClass } from 'aws-cdk-lib/aws-logs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { Schedule, ScheduleExpression, ScheduleGroup, TimeWindow } from 'aws-cdk-lib/aws-scheduler'
import { LambdaInvoke } from 'aws-cdk-lib/aws-scheduler-targets'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { CfnPipe } from 'aws-cdk-lib/aws-pipes'
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam'

export class ProjectWatcherStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>) {
    super(scope, `ProjectWatcher`, { env })
    const lambdaRole = new iam.Role(this, 'LambdaRole', { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') })
    const schedulerRole = new iam.Role(this, 'SchedulerRole', { assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com') })
    const pipeRole = new iam.Role(this, 'PipeRole', { assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com') })

    // This costs $1/month!  The default account key costs nothing :)
    // const encryptionKey = new Key(this, 'CredentialsKMSKey', {
    //   alias: 'ProjectWatcherCredentialsKey',
    //   enabled: true,
    // })
    // encryptionKey.grantDecrypt(role)

    // This costs 40¢/month
    // const secrets = new Secret(this, 'Credentials', {
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   secretName: 'ProjectWatcherCredentials',
    //   encryptionKey: encryptionKey,
    // })
    // secrets.grantRead(role)

    const secretsBucket = new Bucket(this, 'CredentialsBucket', {
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      publicReadAccess: false,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    })
    const credentialsFile = 'credentials.json'
    secretsBucket.grantRead(lambdaRole, credentialsFile)

    const logGroup = new LogGroup(this, 'ScraperLogGroup', {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupClass: LogGroupClass.INFREQUENT_ACCESS,
      logGroupName: 'ScraperFunctionLogs',
    })
    logGroup.grantWrite(lambdaRole)

    const fn = new NodejsFunction(this, 'ScraperFunction', {
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', '..', 'src', 'project-watcher', 'lambda.ts'),
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
        LAMBDA_CREDENTIALS_BUCKET_NAME: secretsBucket.bucketName,
        LAMBDA_CREDENTIALS_FILE_PATH: credentialsFile,
        // AWS_REGION: this.region, // predefined by lambda runtime
      },
    })

    const dlq = new Queue(this, 'ScheduleDQL')
    const topic = new Topic(this, 'SchedulerDlqBroadcaster') // email subscription added by hand
    dlq.grantConsumeMessages(pipeRole)
    topic.grantPublish(pipeRole)
    new CfnPipe(this, 'DlqPipe', {
      name: 'SchedulerDlqToEmailPipe',
      source: dlq.queueArn,
      target: topic.topicArn,
      roleArn: pipeRole.roleArn,
    })

    new Schedule(this, 'InvocationSchedule', {
      enabled: true,
      schedule: ScheduleExpression.cron({ hour: '17', minute: '46', timeZone: TimeZone.EUROPE_LONDON }),
      target: new LambdaInvoke(fn, { retryAttempts: 0, role: schedulerRole, deadLetterQueue: dlq }),
      description: 'Invokes the Project Watcher lambda to update tickets on github boards and occasionally post summaries into confluence.',
    })
  }
}
