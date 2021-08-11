export enum ErrorCode {
  UNKNOWN_ERROR = "0x00000000",
  SERVER_ERROR = "0x00000001",
  REQUEST_ERROR = "0x00000002",
  AUTH_ERROR = "0x00000003",
  ROUTE_ERROR = "0x00000004",
  DATABASE_ERROR = "0x00000005",
  FILE_ERROR = "0x00000006",
}

/**
 * Wraps around the standard`Error` interface to define
 * extra features.
 */
export class _Error extends Error {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    status: number = 500
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }

  status: number;
  code: ErrorCode;
}

/**
 *
 * System wide error definitions.
 * @readonly
 */
export const Errors: any = {
  UNKNOWN_ERROR: new _Error("Unknown Error"),
  UNKNOWN_EXPLAINABLE_ERROR: (message: string) => new _Error(message),
  INTERNAL_SERVER_ERROR: new _Error(
    "Internal server error.",
    ErrorCode.SERVER_ERROR
  ),
  DATABASE_ERROR: new _Error(
    "Internal server error.",
    ErrorCode.DATABASE_ERROR
  ),
  BAD_REQUEST: new _Error(
    "Request is incomplete.",
    ErrorCode.REQUEST_ERROR,
    400
  ),
  UNAUTHORIZED: new _Error("Unauthorized access.", ErrorCode.AUTH_ERROR, 401),
  UNAUTHORIZED_RESOURCE_ACCESS: new _Error(
    "Unauthorized resource access.",
    ErrorCode.AUTH_ERROR,
    403
  ),
  CREDENTIAL_INCORRECT: new _Error(
    "Credential incorrect",
    ErrorCode.AUTH_ERROR,
    401
  ),
  CAN_NOT_ACTIVATE_USER: new _Error(
    "Could not activate user.",
    ErrorCode.DATABASE_ERROR
  ),
  CAN_NOT_ACTIVATE_SESSION: new _Error(
    "Could not activate session.",
    ErrorCode.DATABASE_ERROR
  ),
  USER_ALREADY_EXISTS: new _Error(
    "User already exists.",
    ErrorCode.AUTH_ERROR,
    403
  ),
  SESSION_IS_ALREADY_ACTIVE: new _Error(
    "Session is already active.",
    ErrorCode.AUTH_ERROR,
    403
  ),
  SESSION_IS_NOT_ACTIVE: new _Error(
    "Session is not active.",
    ErrorCode.AUTH_ERROR,
    403
  ),
  ANOTHER_SESSION_IS_ACTIVE: new _Error(
    "Another session is already active. Sign out of that to sign in with this profile",
    ErrorCode.AUTH_ERROR,
    403
  ),
  USER_NOT_FOUND: new _Error("User not found.", ErrorCode.AUTH_ERROR, 404),
  MEDIA_NOT_FOUND: new _Error(
    "Media record not found.",
    ErrorCode.ROUTE_ERROR,
    404
  ),
  RESOURCE_NOT_FOUND: new _Error("Media not found.", ErrorCode.FILE_ERROR, 404),
  MEDIA_TYPE_NOT_SUPPORTED: new _Error(
    `File type not supported.`,
    ErrorCode.REQUEST_ERROR,
    403
  ),
  MEDIA_TOO_LARGE: new _Error(
    "File is too large",
    ErrorCode.REQUEST_ERROR,
    403
  ),
  ALLOWED_SIMULTANEOUS_UPLOADS_EXCEEDED: new _Error(
    "File array exceeds the allowed size",
    ErrorCode.REQUEST_ERROR,
    403
  ),
  NO_NOTIFICATIONS_FOUND: new _Error(
    "No notifications found.",
    ErrorCode.ROUTE_ERROR,
    404
  ),
  CAN_NOT_UPDATE_FILE_RECORD: new _Error(
    "Could not update file record.",
    ErrorCode.DATABASE_ERROR
  ),
  CAN_NOT_REMOVE_FILE_RECORD: new _Error(
    "Could not remove file record.",
    ErrorCode.DATABASE_ERROR
  ),
  FORBIDDEN_UPDATE: new _Error("Forbidden update.", ErrorCode.AUTH_ERROR, 403),
  FORBIDDEN_DELETE: new _Error("Forbidden delete.", ErrorCode.AUTH_ERROR, 403),
  LOGS_NOT_FOUND: new _Error("No logs were found.", ErrorCode.ROUTE_ERROR, 404),
};

export default Errors;
