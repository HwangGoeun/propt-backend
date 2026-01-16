export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  ok: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function unwrapApiResponse<T>(payload: ApiResponse<T>): T {
  if (payload.ok) {
    return payload.data;
  }

  throw new Error(`${payload.error.code}: ${payload.error.message}`);
}
