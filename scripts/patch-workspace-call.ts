import * as fs from 'fs'

let code = fs.readFileSync('lib/approval-workspace.ts', 'utf8')

// Target 1: adding to array destructuring
code = code.replace(
  /sopWinRequestInboxItems,(\r?\n\s*\]\s*=\s*await Promise\.all\(\[)/,
  'sopWinRequestInboxItems,$1  assetManagementInboxItems,$1'
)

// Target 2: adding to Promise.all array
const target2 = `safeQuery(() => getSopWinRequestInboxItems(email, currentEmployee as any), [], "getSopWinRequestInboxItems")
        : Promise.resolve([]),`
const target2Crlf = target2.replace(/\n/g, '\r\n')

const addition = `
      !isDailyOnly && !isOvertimeOnly && !isPtwOnly
        ? safeQuery(() => getAssetManagementInboxItems(email, currentEmployee as any), [], "getAssetManagementInboxItems")
        : Promise.resolve([]),`
const additionCrlf = addition.replace(/\n/g, '\r\n')

if (code.includes(target2Crlf)) {
  code = code.replace(target2Crlf, target2Crlf + additionCrlf)
  console.log('Replaced target2 CRLF')
} else if (code.includes(target2)) {
  code = code.replace(target2, target2 + addition)
  console.log('Replaced target2 LF')
} else {
  console.error('Target 2 not found')
}

// Target 3: fallback in catch block
const target3 = 'sopWinRequestInboxItems: [],'
const addition3 = '\n      assetManagementInboxItems: [],'
const addition3Crlf = '\r\n      assetManagementInboxItems: [],'

if (code.includes('\r\n')) {
  code = code.replace(target3, target3 + addition3Crlf)
} else {
  code = code.replace(target3, target3 + addition3)
}

fs.writeFileSync('lib/approval-workspace.ts', code, 'utf8')
console.log('Finished patching workspace call!')
