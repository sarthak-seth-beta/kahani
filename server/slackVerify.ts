import crypto from "crypto";

const SLACK_SIGNATURE_VERSION = "v0";
const MAX_TIMESTAMP_AGE_SECONDS = 60 * 5; // 5 minutes

/**
 * Verify that a request came from Slack using the signing secret.
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  signingSecret: string,
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: Buffer | undefined,
): boolean {
  if (!signature || !timestamp || !rawBody || !signingSecret) {
    return false;
  }

  // Check timestamp to prevent replay attacks
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > MAX_TIMESTAMP_AGE_SECONDS) {
    return false;
  }

  const [version, expectedHash] = signature.split("=");
  if (version !== SLACK_SIGNATURE_VERSION || !expectedHash) {
    return false;
  }

  // Slack signature base string: v0:timestamp:body
  const base = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody.toString()}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(base);
  const computedHash = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(computedHash, "hex"),
    );
  } catch {
    return false;
  }
}
