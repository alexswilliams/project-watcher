import { Grant, IGrantable, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Code, ILayerVersion, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnPipe } from 'aws-cdk-lib/aws-pipes'
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, IBucket } from 'aws-cdk-lib/aws-s3'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs'
import { Environment, RemovalPolicy, Stack } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import path from 'path'

export class GithubCommonStack extends Stack {
  public readonly credentialsFilePath: string = 'credentials.json'

  public readonly deadLetterQueue: IQueue
  private readonly credentialsBucket: IBucket
  public readonly graphQlLayer: ILayerVersion

  constructor(scope: Construct, env: Required<Environment>) {
    super(scope, `GithubCommon`, { env })
    const pipeRole = new Role(this, 'PipeRole', { assumedBy: new ServicePrincipal('pipes.amazonaws.com') })

    this.credentialsBucket = new Bucket(this, 'CredentialsBucket', {
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      publicReadAccess: false,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    })

    const topic = new Topic(this, 'SchedulerDlqBroadcaster') // email subscription added by hand in the AWS console to prevent disclosing my email on github
    topic.grantPublish(pipeRole)

    this.deadLetterQueue = new Queue(this, 'ScheduleDQL')
    this.deadLetterQueue.grantConsumeMessages(pipeRole)

    new CfnPipe(this, 'DlqPipe', {
      name: 'SchedulerDlqToEmailPipe',
      source: this.deadLetterQueue,
      target: topic,
      roleArn: pipeRole,
    })

    this.graphQlLayer = new LayerVersion(this, 'GraphQlLayer', {
      code: Code.fromAsset(path.join(__dirname, '..', '..', 'src', 'common', 'github', 'graphql')),
      compatibleRuntimes: [Runtime.NODEJS_24_X, Runtime.NODEJS_LATEST],
      removalPolicy: RemovalPolicy.DESTROY,
    })
  }

  public grantReadOnCredentialsFile(identity: IGrantable): Grant {
    return this.credentialsBucket.grantRead(identity, this.credentialsFilePath)
  }
  public credentialBucketName(): string {
    return this.credentialsBucket.bucketName
  }
}
