// Same rule as backend PASSWORD_REGEX: 8–16 chars, one uppercase, one special character.
export const PASSWORD_RULE_TEXT = '8–16 characters with at least one uppercase letter and one special character.'

export function passwordProblem(value) {
  if (!value) return ''
  if (value.length < 8 || value.length > 16) return 'Password must be 8–16 characters.'
  if (!/[A-Z]/.test(value)) return 'Password needs at least one uppercase letter.'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password needs at least one special character (e.g. ! @ # $).'
  return ''
}
