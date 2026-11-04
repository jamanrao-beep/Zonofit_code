import type { Metadata } from "next";
import LaunchOfferForm from "./LaunchOfferForm";

export const metadata: Metadata = {
  title: "Zonofit · Launch Udaipur · Free Gym Membership",
  description: "Apply for a free gym membership in Udaipur and tell Zonofit what worked.",
};

export default function LaunchOfferPage() {
  return <LaunchOfferForm />;
}
