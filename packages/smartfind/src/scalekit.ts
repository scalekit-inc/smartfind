import type { ScalekitSmartConnection, SmartSettings } from "./types.js";

const DEFAULT_SCOPES = [
  "openid",
  "fhirUser",
  "offline_access",
  "user/*.read",
];

export function toScalekitConnection(settings: SmartSettings): ScalekitSmartConnection {
  const notes: string[] = [
    "Paste these into Scalekit AgentKit → Connections → SMART App on FHIR.",
    "You still need a client ID (and secret, if issued) from the EHR developer portal.",
    "Redirect URI comes from the Scalekit connection form — register that exact URI with the EHR.",
  ];

  if (!settings.authorizationEndpoint || !settings.tokenEndpoint) {
    notes.push(
      "authorization_endpoint or token_endpoint missing from .well-known/smart-configuration — verify the FHIR base URL.",
    );
  }

  if (settings.vendor === "epic") {
    notes.push(
      "Epic: register the app in fhir.epic.com / App Orchard. Production iss/aud is per health system.",
    );
  }
  if (settings.vendor === "oracle-health") {
    notes.push(
      "Oracle Health (Cerner): provider authorize URLs are tenant-specific; confirm provider vs patient persona.",
    );
  }

  const suggested = (settings.scopesSupported || [])
    .filter((s) =>
      ["openid", "fhirUser", "offline_access", "online_access", "launch", "profile"].includes(s) ||
      s.startsWith("user/") ||
      s.startsWith("system/"),
    )
    .slice(0, 12);

  return {
    authorizationEndpoint: settings.authorizationEndpoint || "",
    tokenEndpoint: settings.tokenEndpoint || "",
    audience: settings.audience,
    fhirServerDomain: settings.fhirServerDomain,
    suggestedScopes: suggested.length ? suggested : DEFAULT_SCOPES,
    notes,
  };
}
