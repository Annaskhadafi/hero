export interface JobcardApprovalEmailParams {
  jobcardNo: string
  serialNumber: string
  tireSize: string
  brand: string
  customerName: string
  plant: string
  approverName: string
  approverEmail: string
  requesterName?: string
  approvalUrl?: string
}

export interface JobcardApprovalResultEmailParams {
  jobcardNo: string
  serialNumber: string
  tireSize: string
  brand: string
  customerName: string
  plant: string
  approverName: string
  requesterEmail?: string
  requesterName?: string
  notes?: string
}

export async function sendJobcardApprovalEmail(_params: JobcardApprovalEmailParams) {
  return { success: true, disabled: true, message: 'Jobcard approval emails are disabled.' }
}

export async function sendJobcardApprovedEmail(_params: JobcardApprovalResultEmailParams) {
  return { success: true, disabled: true, message: 'Jobcard approval emails are disabled.' }
}

export async function sendJobcardRejectedEmail(_params: JobcardApprovalResultEmailParams) {
  return { success: true, disabled: true, message: 'Jobcard approval emails are disabled.' }
}
