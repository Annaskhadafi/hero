import { getMcuClinics } from "@/app/actions/hc-mcu-clinics";
import { McuClinicsClient } from "./client-page";

export const metadata = { title: "MCU Clinics - HC Settings" };

export default async function McuClinicsPage() {
  const clinics = await getMcuClinics();
  return <McuClinicsClient initialClinics={clinics as any} />;
}
