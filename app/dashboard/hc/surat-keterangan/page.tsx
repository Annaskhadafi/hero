import { db } from "@/db";
import { hrEmployees, hrSections, hrPositions } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { SuratKeteranganClient } from "./client-form";

export const metadata = {
  title: "Surat Keterangan - HC",
};

export default async function SuratKeteranganPage() {
  const employeesData = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeSn: hrEmployees.employeeId,
      joinYear: hrEmployees.joinDate,
      section: hrSections.name,
      jobTitle: hrPositions.rankName,
    })
    .from(hrEmployees)
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hrEmployees.isActive, true))
    .orderBy(asc(hrEmployees.fullName));

  // Map joinDate to joinYear explicitly if needed, but the client probably expects a number/string
  const formattedData = employeesData.map(e => ({
    ...e,
    joinYear: e.joinYear ? new Date(e.joinYear).getFullYear() : new Date().getFullYear(),
    section: e.section || "-",
    jobTitle: e.jobTitle || "-",
  }));

  return <SuratKeteranganClient employees={formattedData} />;
}
