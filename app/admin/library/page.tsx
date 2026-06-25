import { prisma } from "@/lib/prisma";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { LibraryClient } from "./library-client";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  // GATE-3 FIX 4: graceful read gate (card, not a thrown 403).
  const { allowed: canRead } = await checkOfficerPermission("documents", "read");
  if (!canRead) return <OfficerAccessRequired title="Library" permission="Documents" />;
  const { allowed: canWrite } = await checkOfficerPermission("documents", "write");

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  const serialized = documents.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    url: d.url,
    blobUrl: d.blobUrl,
    category: d.category,
    visibility: d.visibility,
    fileName: d.fileName,
    fileSize: d.fileSize ?? d.size ?? null,
    mimeType: d.mimeType,
    createdAt: d.createdAt.toISOString(),
    uploadedBy: d.uploadedBy,
  }));

  return <LibraryClient initialDocuments={serialized} canWrite={canWrite} />;
}
