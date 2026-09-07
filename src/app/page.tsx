import { SuiteDashboard } from "@/components/suite-dashboard";
import {
  loadSuiteSnapshot,
  parseSuiteView,
} from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialView = parseSuiteView(params.view);
  const initialData = loadSuiteSnapshot();

  return (
    <SuiteDashboard initialView={initialView} initialData={initialData} />
  );
}
