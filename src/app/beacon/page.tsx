import type { Metadata } from "next";
import { BeaconStatus } from "@/components/beacon-status";

export const metadata: Metadata = {
  title: "Beacon — Public status",
  description:
    "Calm public status for indie teams. Built as an Agent Suite lifecycle dry run.",
};

export default function BeaconPage() {
  return <BeaconStatus />;
}
