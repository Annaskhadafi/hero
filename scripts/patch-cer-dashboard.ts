import fs from 'fs'

let code = fs.readFileSync('app/dashboard/assets/cer/components/cer-dashboard.tsx', 'utf8')

// 1. Add inProgressRequests filter
const target1 = `  // Filter for Receiving & BAST Tab\r
  const receivingRequests = data.requests.filter((r) =>\r
    ['full_approved', 'received', 'completed'].includes(r.status)\r
  )`

const replace1 = `  // Filter for Requests Tab (In Progress / In Review)\r
  const inProgressRequests = data.requests.filter(\r
    (r) => !['full_approved', 'received', 'completed'].includes(r.status)\r
  )\r
\r
  // Filter for Receiving & BAST Tab (Full Approved / Received / Completed)\r
  const receivingRequests = data.requests.filter((r) =>\r
    ['full_approved', 'received', 'completed'].includes(r.status)\r
  )`

code = code.replace(target1, replace1)

// 2. Update badge for requests tab
const target2 = `<Badge className="ml-1 rounded-full border-0 bg-slate-200 text-[10px] text-slate-700">\r
              {data.requests.length}\r
            </Badge>`

const replace2 = `<Badge className="ml-1 rounded-full border-0 bg-slate-200 text-[10px] text-slate-700">\r
              {inProgressRequests.length}\r
            </Badge>`

code = code.replace(target2, replace2)

// 3. Pass mode to CerTable in both tabs
const target3 = `<CerTable\r
            requests={data.requests}\r
            currentEmployee={data.currentEmployee}\r
            isFinanceOrAdmin={data.isFinanceOrAdmin}\r
            onRefresh={refreshData}\r
          />`

const replace3 = `<CerTable\r
            requests={inProgressRequests}\r
            mode="requests"\r
            currentEmployee={data.currentEmployee}\r
            isFinanceOrAdmin={data.isFinanceOrAdmin}\r
            onRefresh={refreshData}\r
          />`

code = code.replace(target3, replace3)

const target4 = `<CerTable\r
            requests={receivingRequests}\r
            currentEmployee={data.currentEmployee}\r
            isFinanceOrAdmin={data.isFinanceOrAdmin}\r
            onRefresh={refreshData}\r
          />`

const replace4 = `<CerTable\r
            requests={receivingRequests}\r
            mode="receiving"\r
            currentEmployee={data.currentEmployee}\r
            isFinanceOrAdmin={data.isFinanceOrAdmin}\r
            onRefresh={refreshData}\r
          />`

code = code.replace(target4, replace4)

fs.writeFileSync('app/dashboard/assets/cer/components/cer-dashboard.tsx', code, 'utf8')
console.log('Successfully updated cer-dashboard.tsx')
