/**
 * ActionResponse enum.
 * - `OK` means that the action was executed fine.
 * - `NONEXISTENT` means that a handler for the action does not exist.
 * - `ERROR` means that there was an error executing the action.
 * @type {Object}
 */
export const ActionResponse = {
  OK: 0,
  NONEXISTENT: 1,
  ERROR: 2
}
