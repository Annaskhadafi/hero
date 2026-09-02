import { saveWorkflowStudioApprovalAction } from '../app/dashboard/workflow-studio/actions'

async function main() {
  const formData = new FormData()
  formData.append('transactionType', 'five_r_report')
  formData.append('activityName', 'Audit 5R')
  formData.append('templateKey', 'five_r_report')
  formData.append('isActive', 'true')
  formData.append('mode', 'sequential')
  formData.append('notes', 'Matrix approval dinamis untuk 5R')
  formData.append('steps', JSON.stringify([
    { id: 'step-0', label: 'Master Area', type: 'section' },
    { id: 'step-1', label: 'PJO Site / Atasan Langsung', type: 'employee' },
    { id: 'step-2', label: 'Head of CPI Approval', type: 'employee' },
  ]))
  formData.append('siteData', JSON.stringify([
    {
      siteId: '126',
      departmentId: '',
      values: {
        'step-0': '12', // Balikpapan Office
        'step-1': '970', // Muhammad Iqbal
        'step-2': '944', // Bardinia Susi Ekawaty
      },
    },
    {
      siteId: '125',
      departmentId: '',
      values: {
        'step-0': '17', // Jakarta Head Office
        'step-1': '966', // Rendra Rachman
        'step-2': '944', // Bardinia Susi Ekawaty
      },
    },
  ]))

  const result = await saveWorkflowStudioApprovalAction({ status: 'idle', message: '' }, formData)
  console.log('Save result:', result)
}

main().then(() => process.exit(0)).catch(console.error)
