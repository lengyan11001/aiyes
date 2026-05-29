import { redirect } from "next/navigation";
import { GenerationWorkbench } from "@/components/generation-workbench";
import { getWorkbenchData } from "@/lib/workbench-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function GeneratePage() {
  const user = await requireUser();
  if (!user) redirect("/login?tab=login&next=/generate");

  const data = await getWorkbenchData(user);
  return <GenerationWorkbench {...data} />;
}
