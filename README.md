### Goal

To generate a confluence page with a summary of the current and recent work scraped from a github projects board.

The issues on the board are set up as follows:
 - `Status` field with values `To Do`, `In progress`, `Done`, `Blocked`
 - `Project` field, with the name of the project (optionally with a Jira ticket number), e.g. `Some Project - JIRA-12345`

### Infra

Deployed with a CDK project to a dedicated AWS account:
 - Lambda: queries github, generates a page body and updates an existing confluence page
 - EventBridge Rule: schedules the execution of the lambda once per week

### Page Layout

 - Goals
   - A summary of each unique project, split into "now" (derived from tickets in progress) and "next up" (from those in To Do)
 - Weekly Engineering
   - Two itemised lists: Recently Done (broken down by project, drawn from the "Done" status), and "Now" (from the In Progress status)
