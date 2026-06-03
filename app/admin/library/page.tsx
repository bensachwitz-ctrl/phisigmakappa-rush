import { prisma } from "@/lib/prisma";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { LibraryClient } from "./library-client";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireOfficerPermission("documents", "read");
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
