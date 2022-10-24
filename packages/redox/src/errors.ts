export const enum ErrorCodes {
  SCHEDULER,
}

const Errors: Record<number | string, string> = {
  [ErrorCodes.SCHEDULER]:
    'scheduler flush. This is likely a Redox internals bug. ' +
    'Please open an issue at https://github.com/shuvijs/redox/issues/new',
}

export function error(_err: unknown, type: ErrorCodes, ...args: any[]) {
  const e = Errors[type] as any
  const msg = !e
    ? 'unknown error nr: ' + error
    : typeof e === 'function'
    ? e.apply(null, args as any)
    : e
  throw new Error(`[Redox] ${msg}`)
}
