### Goal

To generate a confluence page with a summary of the current and recent work scraped from a github projects board.

The issues on the board are set up as follows:

- `Status` field with values `To Do`, `In progress`, `Done`, `Blocked`, `Done & Reported`
- `Project` field, with the name of the project (optionally with a Jira ticket number), e.g. `Some Project - JIRA-12345`

Once reported on, any issues in `Done` will be automatically moved to `Done & Reported`, and any existing tickets in `Done & Reported` will be archived.

### Infra

Deployed with a CDK project to a dedicated AWS account:

- Lambda: queries github, generates a page body and updates an existing confluence page
- EventBridge Rule: schedules the execution of the lambda once per week

Deploying: in the simplest case, run `npm run synth` to view output and `npm run deploy` to deploy, or `npm run cdk diff` to see what will change.

### Page Layout

- Goals
  - A summary of each unique project, split into "now" (derived from tickets in progress) and "next up" (from those in To Do)
- Weekly Engineering
  - Two itemised lists: Recently Done (broken down by project, drawn from the "Done" status), and "Now" (from the In Progress status)

### Updating

- ```shell
  nvm use || nvm install
  npx npm-upgrade
  npm i
  npm ci
  ```
- Check to see if any later version is available in the `runtime: lambda.Runtime.NODEJS_...` line in the infra source files. If so, update and `npm run deploy`.
- Run the Node Version Reporter lambda to see the exact node version that lambda would run:
  ```shell
  npm run jsversion
  # {...., "body":"\"Version: x.x.x\""} ...
  ```
  - If this is different from the value in `.mvnrc` then update `.nvmrc` with the new version and run `nvm install && npm ci`.
  - If this includes a major version upgrade, also update the `tsconfig` dependency and the `tsconfig.json` file, and also run `npm i` to rebuild the package lock file.
- Run locally to test with `npm run run` (this will update confluence, but _won't_ modify the github board).
