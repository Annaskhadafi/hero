import { db } from "@/db";
import { hrEmployees, hrSections, hrPositions } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { SuratTugasClient } from "./client-form";

export const metadata = {
  title: "Surat Tugas - HC",
};

export default async function SuratTugasPage() {
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

  const formattedData = employeesData.map(e => ({
    ...e,
    joinYear: e.joinYear ? new Date(e.joinYear).getFullYear() : new Date().getFullYear(),
    section: e.section || "-",
    jobTitle: e.jobTitle || "-",
  }));

  return <SuratTugasClient employees={formattedData} />;
}
