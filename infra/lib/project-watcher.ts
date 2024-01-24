import { Duration, Environment, RemovalPolicy, Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { aws_lambda as lambda } from 'aws-cdk-lib'
import { aws_iam as iam } from 'aws-cdk-lib'
import path from 'path'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { LogGroup, LogGroupClass } from 'aws-cdk-lib/aws-logs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'

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
    const secrets = new Secret(this, 'Credentials', {
      removalPolicy: RemovalPolicy.DESTROY,
      secretName: 'ProjectWatcherCredentials',
      // encryptionKey: encryptionKey,
    })
    secrets.grantRead(role)

    const fn = new NodejsFunction(this, 'ScraperFunction', {
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', '..', 'src', 'lambda.ts'),
      role: role,
      timeout: Duration.seconds(30),
      logGroup: new LogGroup(this, 'ScraperLogGroup', {
        retention: RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
        logGroupClass: LogGroupClass.INFREQUENT_ACCESS,
        logGroupName: 'ScraperFunctionLogs',
      }),
      environment: {
        CONFLUENCE_PAGE_ID: '4433739856',
        CONFLUENCE_SPACE_NAME: 'ENG',
        GITHUB_PROJECT_ID: '205',
        LAMBDA_SECRET_NAME: secrets.secretName,
      },
    })

    new Rule(this, 'InvokeSchedule', {
      enabled: true,
      schedule: Schedule.cron({ weekDay: 'Tuesday', hour: '17', minute: '0' }),
      targets: [new LambdaFunction(fn)],
    })
  }
}
