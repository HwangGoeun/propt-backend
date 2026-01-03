export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  ok: false;
  error: ApiError;
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
