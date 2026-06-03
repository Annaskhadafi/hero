import {
  getActiveEmployees,
  getDisciplinaryActions,
  getDisciplinaryStats,
  getViolationCategories,
} from "@/app/actions/disciplinary";

import { DisciplinaryClientPage } from "./client-page";

export const metadata = {
  title: "Tindakan Disiplin - HC",
};

export default async function DisciplinaryPage() {
  const [actions, categories, stats, employees] = await Promise.all([
    getDisciplinaryActions(),
    getViolationCategories(),
    getDisciplinaryStats(),
    getActiveEmployees(),
  ]);

  return (
    <DisciplinaryClientPage
      actions={actions}
      categories={categories}
      stats={stats}
      employees={employees}
    />
  );
}
