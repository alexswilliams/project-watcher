import { aws_iam as iam, aws_lambda as lambda } from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, LogGroupClass, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Duration, Environment, RemovalPolicy, Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import path from 'path'

export class NodeVersionReporterStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>) {
    super(scope, `NodeVersionReporter`, { env })
    const role = new iam.Role(this, 'LambdaRole', { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') })

    const logGroup = new LogGroup(this, 'VersionReporterLogGroup', {
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupClass: LogGroupClass.STANDARD,
      logGroupName: 'NodeVersionReportingFunctionLogs',
    })
    logGroup.grantWrite(role)

    new NodejsFunction(this, 'NodeVersionReportingFunction', {
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', '..', 'src', 'node-version-reporter', 'lambda.ts'),
      role: role,
      timeout: Duration.seconds(10),
      logGroup: logGroup,
    })
  }
}
