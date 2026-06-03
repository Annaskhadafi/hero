import { SecurityUserManagement } from "@/components/security-user-management";
import { getSecurityRoleOptions, getSecurityUserReferenceData, getSecurityUsersData } from "@/lib/hero-admin";

export default async function SecurityUsersPage() {
  const [users, roleOptions, referenceData] = await Promise.all([
    getSecurityUsersData(),
    getSecurityRoleOptions(),
    getSecurityUserReferenceData(),
  ]);

  return (
    <SecurityUserManagement
      users={users}
      roleOptions={roleOptions}
      sections={referenceData.sections}
      departments={referenceData.departments}
      positions={referenceData.positions}
      sites={referenceData.sites}
    />
  );
}
