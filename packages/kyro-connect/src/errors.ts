export class KyroConnectError extends Error {
  public readonly status: number;
  public readonly code: number;
  public readonly raw: any;

  constructor(message: string, status: number = 500, raw?: any) {
    super(message);
    this.name = "KyroConnectError";
    this.status = status;
    this.code = raw?.error?.code ?? -32603;
    this.raw = raw;
  }
}
