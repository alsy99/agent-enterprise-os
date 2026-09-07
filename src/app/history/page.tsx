import { SuiteDashboard } from "@/components/suite-dashboard";
import { loadSuiteSnapshot } from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  return (
    <SuiteDashboard
      key="history"
      initialView="history"
      initialData={loadSuiteSnapshot()}
    />
  );
}
