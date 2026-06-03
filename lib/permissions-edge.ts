// Edge-runtime permission helpers.
//
// Today's session cookie HMAC carries `brotherId` + `isAdmin` flag only — we
// deliberately keep officer permission lookups on the Node side (they need a
// Prisma query), so middleware only enforces *coarse* auth via the existing
// `verifyEdgeSession`. Fine-grained domain gating happens in the Node route
// handler via `requireOfficerPermission`.
//
// `hasEdgePermission` is still exported so that any future cookie schema that
// embeds claims directly can use it without a Prisma round-trip at the edge.

import { hasEdgePermission as _hasEdgePermission } from "@/lib/officer-permissions";

export const hasEdgePermission = _hasEdgePermission;
