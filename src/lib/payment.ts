import type { BaseAdapter } from "../registry/types.js";

export interface PaymentConfig {
  testMode?: boolean;
  provider?: "stripe" | "paypal" | "square" | "manual";
  stripe?: {
    enabled?: boolean;
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  };
  paypal?: {
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string;
    mode?: "sandbox" | "live";
  };
  square?: {
    enabled?: boolean;
    applicationId?: string;
    accessToken?: string;
    locationId?: string;
  };
  methods?: {
    cod?: boolean;
    bankTransfer?: boolean;
    cash?: boolean;
    check?: boolean;
  };
  bankTransfer?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    swift?: string;
  };
}

export function getPaymentConfigFromSettings(settings: any): PaymentConfig {
  if (!settings) return {};
  return {
    testMode: settings.testMode,
    provider: settings.provider,
    stripe: settings.stripe,
    paypal: settings.paypal,
    square: settings.square,
    methods: settings.methods,
    bankTransfer: settings.bankTransfer,
  };
}

export async function getPaymentConfig(
  db: BaseAdapter,
  options?: { draft?: boolean },
): Promise<PaymentConfig> {
  try {
    const doc = await db.findOne({
      collection: "_globals_payment-settings",
      where: {},
      draft: options?.draft ?? false,
    });
    return getPaymentConfigFromSettings(doc);
  } catch {
    return {};
  }
}
