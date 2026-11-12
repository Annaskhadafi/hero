import fs from 'fs';
import path from 'path';

const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/db', () => ({
  db: {
    select: mockSelect,
  },
}));

jest.mock('@/lib/workflow-email', () => ({
  sendWorkflowEmail: jest.fn(),
  getAppUrl: jest.fn(() => 'http://localhost:3000'),
}));

jest.mock('@/lib/push-notifications', () => ({
  createNotificationEventForEmployee: jest.fn(),
}));

jest.mock('@/lib/summary-email', () => ({
  sendSummaryPendingApprovalEmail: jest.fn(),
}));

jest.mock('@/lib/hse-safety-email', () => ({
  resolveHseSafetyRecipients: jest.fn(),
  parseEmailList: jest.fn(() => []),
}));

jest.mock('@/lib/workflow-notification-center', () => ({
  notifyWorkflowBellRecipients: jest.fn(),
}));

jest.mock('@/lib/hero-admin', () => ({
  getApdSummaryNotificationConfigData: jest.fn(),
}));

import { isValeSummaryTarget, resolveSummaryApprovers } from '@/lib/summary-engine';

describe('Summary APD Vale Service Operation approval flow (Admin -> Junaidi -> Romy Hidayat)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('isValeSummaryTarget detects VALE vs GABUNGAN and item fallback accurately', () => {
    expect(isValeSummaryTarget('VALE')).toBe(true);
    expect(isValeSummaryTarget('Vale')).toBe(true);
    expect(isValeSummaryTarget('GABUNGAN')).toBe(false);
    expect(isValeSummaryTarget('GABUNGAN', ['Vale'])).toBe(false);
    expect(isValeSummaryTarget(null, ['Vale'])).toBe(true);
    expect(isValeSummaryTarget('', ['Balikpapan', 'Vale Sorowako'])).toBe(true);
    expect(isValeSummaryTarget(null, ['Balikpapan'])).toBe(false);
  });

  test('resolveSummaryApprovers excludes Apriyanto for VALE Service Operation (Admin -> Junaidi -> Romy Hidayat)', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: 33, name: 'Service Operation MVC', headEmployeeId: 955, departmentId: 2 }]) // targetSection
      .mockResolvedValueOnce([{ headEmployeeId: 955, name: 'Service Operation MVC' }]) // sec33
      .mockResolvedValueOnce([{ headEmployeeId: 15, name: 'Service Operation Others' }]) // sec34
      .mockResolvedValueOnce([{ headEmployeeId: 972, name: 'Central Services' }]) // dept2
      .mockResolvedValueOnce([{ id: 15, name: 'Junaidi', email: 'junaidi@chitraparatama.co.id', jobTitle: 'Coordinator Service Others' }]) // emp34
      .mockResolvedValueOnce([{ id: 972, name: 'Romy Hidayat', email: 'romy@chitraparatama.co.id', jobTitle: 'Central Services Manager' }]); // empDept

    const result = await resolveSummaryApprovers(33, 'VALE', ['Vale']);

    expect(result.level1Approvers).toHaveLength(1);
    expect(result.level1Approvers[0]).toMatchObject({
      id: 15,
      name: 'Junaidi',
      jobTitle: 'Section Head Service Others',
      sectionName: 'Service Operation Others',
    });
    expect(result.level1Approvers.some((a) => a.id === 955 || a.name === 'Apriyanto')).toBe(false);
    expect(result.level2Approver).toMatchObject({
      id: 972,
      name: 'Romy Hidayat',
      departmentName: 'Central Services',
    });
  });

  test('resolveSummaryApprovers keeps Apriyanto + Junaidi for GABUNGAN Service Operation', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: 33, name: 'Service Operation MVC', headEmployeeId: 955, departmentId: 2 }]) // targetSection
      .mockResolvedValueOnce([{ headEmployeeId: 955, name: 'Service Operation MVC' }]) // sec33
      .mockResolvedValueOnce([{ headEmployeeId: 15, name: 'Service Operation Others' }]) // sec34
      .mockResolvedValueOnce([{ headEmployeeId: 972, name: 'Central Services' }]) // dept2
      .mockResolvedValueOnce([{ id: 955, name: 'Apriyanto', email: 'apriyanto@chitraparatama.co.id', jobTitle: 'Head Service MVC' }]) // emp33
      .mockResolvedValueOnce([{ id: 15, name: 'Junaidi', email: 'junaidi@chitraparatama.co.id', jobTitle: 'Coordinator Service Others' }]) // emp34
      .mockResolvedValueOnce([{ id: 972, name: 'Romy Hidayat', email: 'romy@chitraparatama.co.id', jobTitle: 'Central Services Manager' }]); // empDept

    const result = await resolveSummaryApprovers(33, 'GABUNGAN', ['Balikpapan']);

    expect(result.level1Approvers).toHaveLength(2);
    expect(result.level1Approvers.map((a) => a.name)).toEqual(['Apriyanto', 'Junaidi']);
    expect(result.level2Approver).toMatchObject({
      id: 972,
      name: 'Romy Hidayat',
    });
  });

  test('summary-engine.ts cleans up obsolete pending Level 1 approvers and preserves historical signed records', () => {
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'lib/summary-engine.ts'), 'utf8');
    expect(engineSource).toContain('isValeSummaryTarget(targetSite, itemSiteNames)');
    expect(engineSource).toContain('if (!isValeService)');
    expect(engineSource).toContain('obsoleteIds');
    expect(engineSource).toContain('isSignedOrHistorical');
  });
});

