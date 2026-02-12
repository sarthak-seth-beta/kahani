import crypto from "crypto";

// PhonePe Configuration
interface PhonePeConfig {
  environment: "sandbox" | "production";
  merchantId: string;
  clientId: string;
  clientSecret: string;
  clientVersion: string;
  webhookUsername: string;
  webhookPassword: string;
}

// Cached auth token
interface AuthToken {
  accessToken: string;
  expiresAt: number;
}

// Request/Response interfaces
interface CreateOrderRequest {
  amount: number;
  merchantOrderId: string;
  merchantUserId: string;
  redirectUrl: string;
  metadata?: { albumId?: string; packageType?: string };
}

interface CreateOrderResponse {
  success: boolean;
  data?: {
    merchantOrderId: string;
    transactionId: string;
    amount: number;
    instrumentResponse?: {
      redirectInfo?: { url: string };
    };
  };
}

interface PaymentStatusResponse {
  success: boolean;
  data?: {
    merchantOrderId: string;
    transactionId: string;
    amount: number;
    state: "COMPLETED" | "FAILED" | "PENDING";
  };
}

export class PhonePeService {
  private config: PhonePeConfig;
  private authToken: AuthToken | null = null;

  constructor() {
    const env = process.env;
    this.config = {
      environment: (env.PHONEPE_ENVIRONMENT || "sandbox") as any,
      merchantId: env.PHONEPE_MERCHANT_ID || "",
      clientId: env.PHONEPE_CLIENT_ID || "",
      clientSecret: env.PHONEPE_CLIENT_SECRET || "",
      clientVersion: env.PHONEPE_CLIENT_VERSION || "1",
      webhookUsername: env.PHONEPE_WEBHOOK_USERNAME || "",
      webhookPassword: env.PHONEPE_WEBHOOK_PASSWORD || "",
    };
  }

  // Base URL for payment/status APIs
  private getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.phonepe.com/apis/pg"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  }

  // Auth URL uses a different path in production (identity-manager)
  private getAuthUrl(): string {
    return this.config.environment === "production"
      ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
      : `${this.getBaseUrl()}/v1/oauth/token`;
  }

  // Get OAuth access token (cached for 15 minutes)
  public async getAuthToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if valid
    if (this.authToken && this.authToken.expiresAt > now) {
      return this.authToken.accessToken;
    }

    console.log("[PhonePe] Fetching new auth token...", {
      environment: this.config.environment,
      clientId: this.config.clientId ? `${this.config.clientId.slice(0, 8)}...` : "(empty)",
      clientVersion: this.config.clientVersion,
    });

    const authUrl = this.getAuthUrl();
    console.log("[PhonePe] Auth URL:", authUrl);

    const formData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      client_version: this.config.clientVersion,
    });

    const response = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[PhonePe] Auth failed:", response.status, error);
      throw new Error(`PhonePe auth failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error("PhonePe auth response missing access_token");
    }

    // Cache token for 15 minutes
    this.authToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    console.log("[PhonePe] Auth token cached successfully");
    return this.authToken.accessToken;
  }

  // Create payment order
  public async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const accessToken = await this.getAuthToken();
    const url = `${this.getBaseUrl()}/checkout/v2/pay`;

    const payload = {
      merchantOrderId: request.merchantOrderId,
      amount: request.amount,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: { redirectUrl: request.redirectUrl },
      },
      ...(request.metadata && {
        metaInfo: {
          udf1: request.metadata.albumId || "",
          udf2: request.metadata.packageType || "",
        },
      }),
    };

    console.log("[PhonePe] Creating order:", {
      merchantOrderId: request.merchantOrderId,
      amount: request.amount,
      environment: this.config.environment,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.orderId || !data.redirectUrl) {
      console.error("[PhonePe] Order creation failed:", data);
      throw new Error(`PhonePe order failed: ${data.message || data.code || "Unknown error"}`);
    }

    console.log("[PhonePe] Order created:", {
      orderId: data.orderId,
      merchantOrderId: request.merchantOrderId,
    });

    return {
      success: true,
      data: {
        merchantOrderId: request.merchantOrderId,
        transactionId: data.orderId,
        amount: request.amount,
        instrumentResponse: {
          redirectInfo: { url: data.redirectUrl },
        },
      },
    };
  }

  // Check payment status
  public async checkPaymentStatus(merchantOrderId: string): Promise<PaymentStatusResponse> {
    const accessToken = await this.getAuthToken();
    const url = `${this.getBaseUrl()}/checkout/v2/order/${merchantOrderId}/status?details=true&errorContext=true`;

    console.log("[PhonePe] Checking payment status:", merchantOrderId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[PhonePe] Status check failed:", data);
      throw new Error(`PhonePe status check failed: ${data.message || data.code || "Unknown error"}`);
    }

    // Extract transaction ID from paymentDetails (primary) or fallback fields
    const latestPayment = data.paymentDetails?.[0];
    const transactionId =
      latestPayment?.transactionId ||
      data.transactionId ||
      data.orderId ||
      merchantOrderId;

    const amount = data.amount || latestPayment?.amount || 0;

    console.log("[PhonePe] Payment status:", {
      merchantOrderId,
      state: data.state,
      transactionId,
      amount,
    });

    return {
      success: true,
      data: {
        merchantOrderId,
        transactionId,
        amount,
        state: data.state,
      },
    };
  }

  // Verify webhook Authorization header (v2: SHA256 of username:password)
  public verifyWebhookAuthorization(authHeader: string): boolean {
    try {
      if (!this.config.webhookUsername || !this.config.webhookPassword) {
        console.error("[PhonePe] Webhook credentials not configured");
        return false;
      }
      const expected = crypto
        .createHash("sha256")
        .update(`${this.config.webhookUsername}:${this.config.webhookPassword}`)
        .digest("hex");
      return expected === authHeader;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const phonePeService = new PhonePeService();
