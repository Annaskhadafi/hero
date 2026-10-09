import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Marital Status Request Workflow Integration', () => {
  it('registers marital status schema and exports canonical constants', () => {
    const constantsSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/marital-status-constants.ts'),
      'utf8'
    );
    expect(constantsSource).toContain('MARITAL_STATUS_OPTIONS');
    expect(constantsSource).toContain('Single On Site');
    expect(constantsSource).toContain('Married On Site');

    const dataSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/marital-status-data.ts'),
      'utf8'
    );
    expect(dataSource).toContain('ensureMaritalStatusRequestSchema');
    expect(dataSource).toContain('fetchMaritalStatusRequests');
  });

  it('defines server actions for submit, approve, reject, delete and profile auto-sync', () => {
    const actionsSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/central-service/marital-status/actions.ts'),
      'utf8'
    );
    expect(actionsSource).toContain('submitMaritalStatusRequestAction');
    expect(actionsSource).toContain('approveMaritalStatusStepAction');
    expect(actionsSource).toContain('rejectMaritalStatusStepAction');
    expect(actionsSource).toContain('deleteMaritalStatusRequestAction');

    // Verify auto-sync to hero_employees upon approval
    expect(actionsSource).toContain('maritalStatus: request.targetMaritalStatus');
  });

  it('registers menu item under Central Service Management area', () => {
    const menuAdminSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/hero-admin.ts'),
      'utf8'
    );
    expect(menuAdminSource).toContain('/dashboard/central-service/marital-status');
    expect(menuAdminSource).toContain('central_service_marital_status');

    const menusJsonSource = fs.readFileSync(
      path.join(process.cwd(), 'menus.json'),
      'utf8'
    );
    expect(menusJsonSource).toContain('/dashboard/central-service/marital-status');
  });

  it('integrates default approval workflow resolver in approval-engine', () => {
    const approvalEngineSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/approval-engine.ts'),
      'utf8'
    );
    expect(approvalEngineSource).toContain('resolveMaritalStatusApprovalRoute');
    expect(approvalEngineSource).toContain('Step 1: PJO / HSE / Leader');
    expect(approvalEngineSource).toContain('Step 2: Section Head');
    expect(approvalEngineSource).toContain('slaHours: 0');
  });

  it('registers email template presets in centralized Settings > Email system', () => {
    const presetSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/email-template-presets.ts'),
      'utf8'
    );
    expect(presetSource).toContain('marital_status_approval_requested');
    expect(presetSource).toContain('marital_status_request_approved');
    expect(presetSource).toContain('marital_status_request_rejected');
    expect(presetSource).toContain('marital_status_request_reverted');

    const emailSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/marital-status-email.ts'),
      'utf8'
    );
    expect(emailSource).toContain('sendMaritalStatusApprovalRequestedEmail');
    expect(emailSource).toContain('sendMaritalStatusApprovedEmail');
    expect(emailSource).toContain('sendMaritalStatusRejectedEmail');
    expect(emailSource).toContain('sendMaritalStatusRevertedEmail');
  });

  it('integrates MaritalStatusApprovalDialog into Approval Inbox workbench', () => {
    const dialogSource = fs.readFileSync(
      path.join(process.cwd(), 'components/admin/marital-status-approval-dialog.tsx'),
      'utf8'
    );
    expect(dialogSource).toContain('MaritalStatusApprovalDialog');
    expect(dialogSource).toContain('Dokumen Resmi F.HR.STD.001 00');

    const workbenchSource = fs.readFileSync(
      path.join(process.cwd(), 'components/approval-workbench.tsx'),
      'utf8'
    );
    expect(workbenchSource).toContain('MaritalStatusApprovalDialog');
    expect(workbenchSource).toContain('maritalStatusRequestId');
  });

  it('registers Marital Status notification settings panel, server action, schema, and email CC integration', () => {
    const schemaSource = fs.readFileSync(
      path.join(process.cwd(), 'db/schema/hero.ts'),
      'utf8'
    );
    expect(schemaSource).toContain('maritalStatusNotificationConfig');
    expect(schemaSource).toContain('hero_marital_status_notification_config');

    const adminSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/hero-admin.ts'),
      'utf8'
    );
    expect(adminSource).toContain('getMaritalStatusNotificationConfigData');

    const actionsSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/settings/email/actions.ts'),
      'utf8'
    );
    expect(actionsSource).toContain('saveMaritalStatusNotificationConfigAction');
    expect(actionsSource).toContain('maritalStatusNotificationSchema');

    const panelSource = fs.readFileSync(
      path.join(process.cwd(), 'components/marital-status-notification-settings-panel.tsx'),
      'utf8'
    );
    expect(panelSource).toContain('MaritalStatusNotificationSettingsPanel');
    expect(panelSource).toContain('Simpan Pengaturan Status Pernikahan');

    const pageSource = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/settings/email/page.tsx'),
      'utf8'
    );
    expect(pageSource).toContain('MaritalStatusNotificationSettingsPanel');
    expect(pageSource).toContain('getMaritalStatusNotificationConfigData');
    expect(pageSource).toContain('value="marital-status"');
    expect(pageSource).toContain('Perubahan Status');

    const emailSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/marital-status-email.ts'),
      'utf8'
    );
    expect(emailSource).toContain('getMaritalStatusCcEmails');
    expect(emailSource).toContain('getMaritalStatusNotificationConfigData');
  });
});
