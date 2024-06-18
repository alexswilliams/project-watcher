import { CfnOutput, Environment, Stack } from 'aws-cdk-lib'
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export class CrossAccountAccessRoleStack extends Stack {
  constructor(scope: Construct, env: Required<Environment>, parentAccount: string, accountName: string) {
    super(scope, 'CrossAccountAccessRole', { env })

    const role = new Role(this, 'AdminRole', {
      assumedBy: new AccountPrincipal(parentAccount),
      roleName: accountName + 'AdminRole',
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    })

    new CfnOutput(this, 'AdminRoleSwitchUrl', {
      value: `https://signin.aws.amazon.com/switchrole?roleName=${role.roleName}&account=${this.account}`,
    })
  }
}
