export type TicketStatus = `NO_STATUS` | `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE` | `DONE_AND_REPORTED`

const statusTextToStatus: { [key in string]: TicketStatus } = {
  todo: 'TODO',
  inprogress: 'IN_PROGRESS',
  blocked: 'BLOCKED',
  done: 'DONE',
  donereported: 'DONE_AND_REPORTED',
}

function normaliseStatusName(status: string) {
  return status.toLowerCase().replaceAll(/[^a-z]/g, '')
}

export function statusTextToEnum(status: string | null): TicketStatus {
  if (!status) return 'NO_STATUS'
  const normalised = normaliseStatusName(status)
  const found = statusTextToStatus[normalised]
  if (!found) throw Error(`Encountered undefined value: could not find normalised status ${normalised} from status ${status}`)
  return found
}
