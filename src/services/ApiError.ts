/** Error thrown for a non-2xx API response; carries the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Builds an ApiError from a failed response. The body is read defensively because
 * some responses (413, 500) are not guaranteed to use the `{ message }` shape.
 */
export async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => ({})) as { message?: string };
  return new ApiError(response.status, body.message ?? `${fallback}: ${response.status} ${response.statusText}`);
}
