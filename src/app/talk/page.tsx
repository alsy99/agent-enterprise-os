import { SuiteDashboard } from "@/components/suite-dashboard";
import { loadSuiteSnapshot } from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function TalkPage() {
  return (
    <SuiteDashboard
      key="talk"
      initialView="talk"
      initialData={loadSuiteSnapshot()}
    />
  );
}
