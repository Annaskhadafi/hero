import { describe, it, expect } from 'vitest';
import { resolveEmployeeApproverHierarchy, type EmployeeHierarchyInfo } from '../lib/overtime-hierarchy';

describe('Overtime Hierarchy - PJO Site Default (Vale & Mining Sites)', () => {
  const employees: EmployeeHierarchyInfo[] = [
    // Vale Site Head / PJO
    {
      id: 1013,
      name: 'Andika Septiadi',
      position: 'PJO',
      department: 'Central Services',
      section: 'Service Operation Others',
      siteId: 140,
    },
    // Service Section Head
    {
      id: 15,
      name: 'Junaidi',
      position: 'Serviceman',
      department: 'Central Services',
      section: 'Service Operation Others',
      siteId: 140,
    },
    // Repair Section Head
    {
      id: 86,
      name: 'Ary Maulana',
      position: 'Leader Repair / Retread Operation',
      department: 'Central Services',
      section: 'Repair / Retread Operation',
      siteId: 140,
    },
    // Vale Serviceman (Service Operation Others)
    {
      id: 1229,
      name: 'Harni Hamdan',
      employeeId: '73752',
      position: 'Serviceman',
      department: 'Central Services',
      section: 'Service Operation Others',
      siteId: 140,
      siteHeadId: 1013, // Andika Septiadi (Head Location Vale)
      sectionHeadId: 15, // Junaidi
      directManagerId: null,
    },
    // Vale Repair Technician (Repair / Retread Operation)
    {
      id: 1239,
      name: 'Ismar Shahrir',
      employeeId: '73753',
      position: 'Mechanic',
      department: 'Central Services',
      section: 'Repair / Retread Operation',
      siteId: 140,
      siteHeadId: 1013, // Andika Septiadi (Head Location Vale)
      sectionHeadId: 86, // Ary Maulana
      directManagerId: null,
    },
    // HO Employee (Head Office Balikpapan - no dedicated PJO)
    {
      id: 999,
      name: 'Staff HO',
      position: 'Staff',
      department: 'Finance',
      section: 'Accounting',
      siteId: 126,
      siteHeadId: null,
      sectionHeadId: 50,
      directManagerId: 50,
    },
    {
      id: 50,
      name: 'SPV Accounting',
      position: 'Supervisor',
      department: 'Finance',
      section: 'Accounting',
      siteId: 126,
    },
  ];

  it('should default approver to PJO (Andika Septiadi) for Vale Service employee (Harni Hamdan), not bypassed to Junaidi', () => {
    const res = resolveEmployeeApproverHierarchy(1229, employees);

    expect(res.requester?.name).toBe('Harni Hamdan');
    // Leader is Section Head (Junaidi)
    expect(res.leader?.id).toBe(15);
    expect(res.leader?.name).toBe('Junaidi');

    // Superior & PJO must be Andika Septiadi (Site Head from master data)
    expect(res.superior?.id).toBe(1013);
    expect(res.superior?.name).toBe('Andika Septiadi');
    expect(res.pjo?.id).toBe(1013);
    expect(res.pjo?.name).toBe('Andika Septiadi');

    // DefaultApprover for Mobile SPL must be Andika Septiadi (PJO Site)
    expect(res.defaultApprover?.id).toBe(1013);
    expect(res.defaultApprover?.name).toBe('Andika Septiadi');
  });

  it('should default approver to PJO (Andika Septiadi) for Vale Repair employee (Ismar Shahrir)', () => {
    const res = resolveEmployeeApproverHierarchy(1239, employees);

    expect(res.requester?.name).toBe('Ismar Shahrir');
    // Leader is Repair Section Head (Ary Maulana)
    expect(res.leader?.id).toBe(86);
    expect(res.leader?.name).toBe('Ary Maulana');

    // Superior & PJO must be Andika Septiadi
    expect(res.superior?.id).toBe(1013);
    expect(res.superior?.name).toBe('Andika Septiadi');
    expect(res.pjo?.id).toBe(1013);
    expect(res.pjo?.name).toBe('Andika Septiadi');

    // DefaultApprover for Mobile SPL must be Andika Septiadi
    expect(res.defaultApprover?.id).toBe(1013);
    expect(res.defaultApprover?.name).toBe('Andika Septiadi');
  });

  it('should fallback to direct manager / section head when employee is not at a site with dedicated PJO', () => {
    const res = resolveEmployeeApproverHierarchy(999, employees);

    expect(res.requester?.name).toBe('Staff HO');
    expect(res.leader?.id).toBe(50);
    expect(res.leader?.name).toBe('SPV Accounting');
    expect(res.defaultApprover?.id).toBe(50);
  });
});
