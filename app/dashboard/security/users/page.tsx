import { SecurityUserManagement } from "@/components/security-user-management";
import { getSecurityRoleOptions, getSecurityUserReferenceData, getSecurityUsersData } from "@/lib/hero-admin";
import { getCurrentMenuPermission } from "@/lib/hero-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SecurityUsersPage() {
  const [users, roleOptions, referenceData, permission] = await Promise.all([
    getSecurityUsersData(),
    getSecurityRoleOptions(),
    getSecurityUserReferenceData(),
    getCurrentMenuPermission("security_users"),
  ]);

  return (
    <SecurityUserManagement
      users={users}
      roleOptions={roleOptions}
      sections={referenceData.sections}
      departments={referenceData.departments}
      positions={referenceData.positions}
      sites={referenceData.sites}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  );
}
