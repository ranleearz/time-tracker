export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function pgCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}
