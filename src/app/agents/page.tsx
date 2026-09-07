import { SuiteDashboard } from "@/components/suite-dashboard";
import { loadSuiteSnapshot } from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  return (
    <SuiteDashboard
      key="agents"
      initialView="agents"
      initialData={loadSuiteSnapshot()}
    />
  );
}
