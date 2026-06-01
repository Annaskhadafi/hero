import { getTechnicalEngineers } from "@/app/actions/technical-engineer";
import { TechnicalEngineerClientPage } from "./client-page";

export const metadata = {
  title: "Data Technical Engineer - HC",
};

export default async function TechnicalEngineerPage() {
  const data = await getTechnicalEngineers();
  
  return <TechnicalEngineerClientPage employees={data} />;
}
