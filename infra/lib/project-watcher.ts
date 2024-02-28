import { Duration, Environment, RemovalPolicy, Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { aws_lambda as lambda } from 'aws-cdk-lib'
import { aws_iam as iam } from 'aws-cdk-lib'
import path from 'path'
import { LogGroup, LogGroupClass } from 'aws-cdk-lib/aws-logs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3'

export class ProjectWatcherStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>) {
    super(scope, `ProjectWatcher`, { env })
    const role = new iam.Role(this, 'LambdaRole', { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') })

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
    secretsBucket.grantRead(role, credentialsFile)

    const logGroup = new LogGroup(this, 'ScraperLogGroup', {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupClass: LogGroupClass.INFREQUENT_ACCESS,
      logGroupName: 'ScraperFunctionLogs',
    })
    logGroup.grantWrite(role)

    const fn = new NodejsFunction(this, 'ScraperFunction', {
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', '..', 'src', 'lambda.ts'),
      role: role,
      timeout: Duration.seconds(30),
      logGroup: logGroup,
      environment: {
        GITHUB_PROJECT_TO_PAGE_MAPPINGS: JSON.stringify({
          '205': { pageId: '4433739856', goalsUid: '482aaeaf-142c-416b-a7cd-eb6228de1505', weeklyUid: '4ceae4f5-6037-413a-b266-6222debaeb32' },
          '196': { pageId: '4456153137', goalsUid: '92ad0576-474b-4ceb-bb3f-ee29c3e8d667', weeklyUid: 'bdcd41a8-87ec-4064-b5ed-5576d3f82f44' },
        }),
        CONFLUENCE_SPACE_NAME: 'ENG',
        LAMBDA_CREDENTIALS_BUCKET_NAME: secretsBucket.bucketName,
        LAMBDA_CREDENTIALS_FILE_PATH: credentialsFile,
        // AWS_REGION: this.region, // predefined by lambda runtime
      },
    })

    new Rule(this, 'InvokeSchedule', {
      enabled: true,
      schedule: Schedule.cron({ weekDay: 'Tuesday', hour: '17', minute: '0' }),
      targets: [new LambdaFunction(fn)],
    })
  }
}
