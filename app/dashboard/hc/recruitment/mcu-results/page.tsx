import { getAllMcuRecords } from "@/app/actions/mcu";
import { RecruitmentMcuResultsClientPage } from "./client-page";

export const metadata = {
  title: "MCU Results - HC",
};

export default async function McuResultsPage() {
  const records = await getAllMcuRecords();
  return <RecruitmentMcuResultsClientPage records={records} />;
}
