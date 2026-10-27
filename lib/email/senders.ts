// SERVER ONLY. Allowed sender addresses for outbound mail on vantorflow.com.ng.
export const SENDER_LOCALPARTS = ["frank", "admin", "support", "service"] as const;
export type SenderLocalpart = (typeof SENDER_LOCALPARTS)[number];

export const SENDER_DOMAIN = "vantorflow.com.ng";
export const SENDER_NAME = "Vantorflow";

export function senderAddress(local: SenderLocalpart): string {
  return `${local}@${SENDER_DOMAIN}`;
}

export function isSenderLocalpart(v: unknown): v is SenderLocalpart {
  return typeof v === "string" && (SENDER_LOCALPARTS as readonly string[]).includes(v);
}
