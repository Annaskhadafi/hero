import { SecurityUserManagement } from "@/components/security-user-management";
import { getSecurityRoleOptions, getSecurityUsersData } from "@/lib/hero-admin";
import {
  getSectionOptions,
  getDepartmentOptions,
  getPositionOptions,
  getSiteOptions,
} from "@/lib/master-data";

export default async function SecurityUsersPage() {
  const [users, roleOptions, sections, departments, positions, sites] = await Promise.all([
    getSecurityUsersData(),
    getSecurityRoleOptions(),
    getSectionOptions(),
    getDepartmentOptions(),
    getPositionOptions(),
    getSiteOptions(),
  ]);

  return (
    <SecurityUserManagement
      users={users}
      roleOptions={roleOptions}
      sections={sections}
      departments={departments}
      positions={positions}
      sites={sites}
    />
  );
}
