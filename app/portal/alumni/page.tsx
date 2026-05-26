import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import AlumniLoginPage from "./AlumniLoginPage";

export const dynamic = "force-dynamic";

export default async function AlumniPortalRootPage() {
  const sess = getPortalSession();
  
  if (sess && sess.role === "alumni") {
    redirect("/portal/alumni/dashboard");
  }

  return <AlumniLoginPage />;
}
