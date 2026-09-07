import { SuiteDashboard } from "@/components/suite-dashboard";
import { loadSuiteSnapshot } from "@/lib/suite/snapshot";

export const dynamic = "force-dynamic";

export default async function NewObjectivePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.error;
  const error = Array.isArray(raw) ? raw[0] : raw;

  return (
    <SuiteDashboard
      key="new"
      initialView="board"
      initialData={loadSuiteSnapshot()}
      showDispatch
      formError={
        error === "empty"
          ? "Write a brief for Nova first."
          : error
            ? decodeURIComponent(error)
            : null
      }
    />
  );
}
