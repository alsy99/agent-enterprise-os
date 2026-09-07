import { SuiteDashboard } from "@/components/suite-dashboard";
import { loadSuiteSnapshot } from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  return (
    <SuiteDashboard
      key="skills"
      initialView="skills"
      initialData={loadSuiteSnapshot()}
    />
  );
}
