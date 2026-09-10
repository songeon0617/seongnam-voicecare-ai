import { archiveResponse } from "./lib/archive";

// No matcher exclusions: block pages, APIs, assets and image optimization alike.
// Vercel Authentication must separately protect existing immutable deployments.
export function proxy() {
  return archiveResponse();
}
