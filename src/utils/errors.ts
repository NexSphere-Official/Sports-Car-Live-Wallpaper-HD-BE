/**
 * Public error codes — clients depend on these strings.
 * Treat as a stable contract; do not rename without a deprecation cycle.
 */
export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_CURSOR: "INVALID_CURSOR",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
