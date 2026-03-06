import crypto from "crypto";

const SLACK_SIGNATURE_HEADER = "x-slack-signature";
const SLACK_SIGNATURE_VERSION = "v0";

/**
 * Verify that a request came from Slack using the signing secret.
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  signingSecret: string,
  signature: string | undefined,
  rawBody: Buffer | undefined,
): boolean {
  if (!signature || !rawBody || !signingSecret) {
    return false;
  }

  const [version, expectedHash] = signature.split("=");
  if (version !== SLACK_SIGNATURE_VERSION || !expectedHash) {
    return false;
  }

  const base = `${SLACK_SIGNATURE_VERSION}:${rawBody.toString()}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(base);
  const computedHash = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(computedHash, "hex"),
  );
}
