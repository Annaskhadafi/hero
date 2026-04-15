import { SecurityUserManagement } from "@/components/security-user-management";
import { getSecurityRoleOptions, getSecurityUsersData } from "@/lib/hero-admin";
import {
  getSectionOptions,
  getDepartmentOptions,
  getPositionOptions,
} from "@/lib/master-data";

export default async function SecurityUsersPage() {
  const [users, roleOptions, sections, departments, positions] = await Promise.all([
    getSecurityUsersData(),
    getSecurityRoleOptions(),
    getSectionOptions(),
    getDepartmentOptions(),
    getPositionOptions(),
  ]);

  return (
    <SecurityUserManagement
      users={users}
      roleOptions={roleOptions}
      sections={sections}
      departments={departments}
      positions={positions}
    />
  );
}
