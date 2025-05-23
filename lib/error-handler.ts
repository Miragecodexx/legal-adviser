// Error types
export enum ErrorType {
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Error with additional context
export class AppError extends Error {
  type: ErrorType
  context?: Record<string, any>

  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN_ERROR, context?: Record<string, any>) {
    super(message)
    this.name = "AppError"
    this.type = type
    this.context = context
  }

  static fromError(error: unknown, type: ErrorType = ErrorType.UNKNOWN_ERROR): AppError {
    if (error instanceof AppError) {
      return error
    }

    const message = error instanceof Error ? error.message : String(error)
    return new AppError(message, type)
  }
}

// Error handler
export function handleError(error: unknown, context?: Record<string, any>): AppError {
  const appError = AppError.fromError(error)

  // Add context if provided
  if (context) {
    appError.context = { ...appError.context, ...context }
  }

  // Log error
  console.error(`❌ ${appError.type}: ${appError.message}`, appError.context)

  return appError
}

// User-friendly error messages
export function getUserFriendlyErrorMessage(error: unknown): string {
  const appError = error instanceof AppError ? error : AppError.fromError(error)

  switch (appError.type) {
    case ErrorType.API_ERROR:
      return "There was a problem connecting to the AI service. Please try again later."
    case ErrorType.VALIDATION_ERROR:
      return "The information provided is invalid. Please check your inputs and try again."
    case ErrorType.STORAGE_ERROR:
      return "There was a problem saving your document. Please try again."
    case ErrorType.NETWORK_ERROR:
      return "Network connection issue. Please check your internet connection and try again."
    default:
      return "An unexpected error occurred. Please try again or contact support."
  }
}
