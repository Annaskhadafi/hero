from pathlib import Path
from shutil import copyfile
from docx import Document

REFERENCE = Path(r"C:\Users\Anas\.codex\plugins\cache\openai-curated-remote\openai-templates\0.1.1\skills\artifact-template-system-design\assets\reference.docx")
OUTPUT = Path(r"D:\[01] PROJECT\HERO\paper\Overtime_SPL_System_Design.docx")

def setp(doc, index, text):
    doc.paragraphs[index].text = text

def sett(table, row, col, text):
    table.cell(row, col).text = text

copyfile(REFERENCE, OUTPUT)
doc = Document(OUTPUT)

setp(doc, 8, "HERO Attendance Overtime SPL")
setp(doc, 9, "Separating Mandatory Overtime and Approved SPL Overtime")
setp(doc, 22, "This design separates mandatory overtime calculated from attendance policy from additional overtime authorized by an approved Surat Perintah Lembur (SPL). The attendance workspace keeps both views on the same employee and date grid. Mandatory overtime is sourced from configured overtime windows; Overtime SPL is the actual attendance time that intersects an approved SPL window after mandatory overtime has been removed.")
setp(doc, 23, "The design covers the attendance page, its existing approved SPL input, the shared overtime policy calculation, and navigation to the signed SPL approval document. It does not change SPL approval, signature capture, payroll rates, or attendance editing. A cell with multiple approved SPL documents presents document choices rather than guessing which document to open.")
setp(doc, 28, "The current attendance workspace already calculates a combined overtime result and receives approved SPL windows scoped to visible employees and sites. Showing the combined value in the Overtime tab makes mandatory overtime and document-backed overtime indistinguishable, which prevents reviewers from reconciling the attendance grid with approved SPL documents.")
setp(doc, 29, "The page remains the presentation boundary. The shared policy calculator remains the decision boundary: it produces autoMinutes for mandatory overtime and splMinutes for approved SPL time outside mandatory windows. The invariant is that one attendance minute belongs to at most one of these two views.")
setp(doc, 40, "A user opens Attendance, selects the period and site, and chooses either Overtime or Overtime SPL. The page already loads attendance intervals, roster policy, employee visibility, and approved SPL windows.")
setp(doc, 41, "The server scopes employee and SPL rows by the current scheduling permission, employee visibility, and site scope. The feature accepts only approved SPL documents; pending, rejected, reverted, and other non-approved documents do not contribute.")
setp(doc, 42, "The workspace loads the employee site overtime configuration, roster day classification, attendance clock-in and clock-out values, holidays, and approved SPL windows for the employee.")
setp(doc, 43, "The calculator intersects actual attendance with configured mandatory overtime windows and with each approved SPL interval. SPL time is then reduced by the mandatory overtime interval. The result exposes autoMinutes, splMinutes, source, and contributing SPL numbers.")
setp(doc, 44, "The feature is read-only. No attendance, SPL, approval, signature, or payroll record is written when a tab is selected or a document is opened.")
setp(doc, 45, "The grid renders the calculated value. Clicking an Overtime SPL cell navigates to the canonical SPL approval document route. Multiple SPL numbers are presented as choices before navigation.")
setp(doc, 46, "The page shows zero or an empty marker when no eligible interval exists. Document navigation remains subject to the route's authorization checks. UI errors are surfaced without changing attendance state.")
setp(doc, 54, "Mandatory and SPL minutes are derived from the same attendance interval and are disjoint by construction. The SPL view cannot include time already assigned to mandatory overtime.")
setp(doc, 55, "Each calculation is keyed by employee, period, day, site, and the current policy inputs. SPL document identity is retained through splNumbers for traceability.")
setp(doc, 56, "The result captures employee and SPL identifiers, work dates, planned SPL bounds, status, and payroll period as provided by the approved SPL query.")
setp(doc, 57, "The attendance calculation is a view-level operational result. It is not a replacement for the SPL approval record or the payroll source of truth.")
setp(doc, 58, "The versioned schema or interface definition is published at ")
setp(doc, 59, "lib/timesheet/overtime-policy.ts and update it with each contract release.")
setp(doc, 63, "The calculation is deterministic for a fixed attendance record, policy configuration, period, and approved SPL set. Re-rendering the grid does not create side effects. A policy change affects the next calculation; it does not rewrite historical attendance or approval records.")
setp(doc, 67, "Authorization is enforced by the attendance permission and server-side employee/site scope. The document route must apply its own authorization and must not trust employeeId, siteId, or SPL identifiers supplied by the browser.")
setp(doc, 68, "The grid exposes only the employee and document metadata needed for reconciliation. Signature and document details remain in the protected SPL approval page; logs must not contain signed payloads or secrets.")
setp(doc, 69, "No credentials or signed URLs are introduced by this feature. Document access uses the existing authenticated approval route.")
setp(doc, 70, "The tab is read-only. Missing or malformed time values yield zero for the affected interval and do not bypass access checks.")
setp(doc, 71, "Existing approval, signature, audit, and retention rules remain authoritative. This feature adds no new persistence.")

t = doc.tables
sett(t[0], 0, 0, "STATUS\nProposed")
sett(t[0], 0, 2, "OWNER\nHERO Scheduling")
sett(t[0], 0, 4, "LAST UPDATED\nNovember 2, 2026")
for r, c, v in [(0,1,""),(0,3,"")]: sett(t[0],r,c,v)
for row, val in [(0,"HERO Scheduling"),(1,"HERO Engineering and QA"),(2,"/dashboard/scheduling-timesheet/attendance; SPL approval route"),(3,"Attendance grid views for mandatory and approved SPL overtime")]: sett(t[1],row,1,val)

goals = [
    ("Show mandatory overtime separately", "Rework SPL approval or signature capture"),
    ("Show actual approved SPL overlap outside mandatory overtime", "Change payroll calculation or rates"),
    ("Keep employee, period, site, and permission scopes intact", "Expose unrestricted SPL documents"),
    ("Allow reconciliation to signed SPL documents", "Add write actions to the attendance tab"),
]
for i,(a,b) in enumerate(goals,1): sett(t[2],i,0,a); sett(t[2],i,1,b)
arch = [
    ("Attendance workspace","Renders tabs, grid cells, totals, and document choices.","Existing attendance and approved SPL props","Rendering failure leaves source data unchanged."),
    ("Overtime policy calculator","Separates autoMinutes and splMinutes from actual attendance.","Policy config and approved SPL windows","Malformed intervals contribute zero."),
    ("Approved SPL query","Provides visible approved windows and identifiers.","Overtime command letters and participants","Unavailable rows are omitted from the view."),
    ("SPL approval document route","Shows the system document and approval signatures.","SPL approval and signature records","Authorization or missing document returns an error page."),
    ("E2E and QA","Verifies tab values, overlap boundaries, and document navigation.","Test artifacts and reports","Failed proof blocks release."),
]
for i,row in enumerate(arch,1):
    for j,v in enumerate(row): sett(t[3],i,j,v)
contracts = [
    ("employeeId","number","Yes","Visible employee owning the attendance interval."),
    ("workDate","date","Yes","Local work date used to align SPL timestamps."),
    ("autoMinutes","number","Yes","Mandatory overtime minutes from configured windows."),
    ("splMinutes","number","Yes","Approved SPL minutes outside mandatory overtime."),
    ("splNumbers","string[]","No","Contributing SPL numbers for document reconciliation."),
    ("status","string","Yes","Only approved SPL records are eligible."),
    ("plannedStartAt / plannedEndAt","datetime","No","SPL interval used for overlap calculation."),
]
for i,row in enumerate(contracts,1):
    for j,v in enumerate(row): sett(t[4],i,j,v)
scenarios = [
    ("Same minute appears in both windows","Count it only in mandatory overtime; SPL shows the remainder.","The two tabs are mutually exclusive."),
    ("Pending or rejected SPL","Contribute zero SPL minutes and no document choice.","Only approved status is eligible."),
    ("Multiple SPLs on one date","Show all contributing SPL numbers for selection.","Avoids silently opening the wrong signed document."),
    ("Clock or planned time is invalid","Return zero for the invalid interval and preserve the page.","Malformed input cannot create payable time."),
]
for i,row in enumerate(scenarios,1):
    for j,v in enumerate(row): sett(t[5],i,j,v)
ops = [
    ("Tab correctness","E2E shows mandatory and SPL cells separately","Scheduling","Required"),
    ("Overlap correctness","Focused policy tests cover partial and full overlap","Scheduling","Required"),
    ("Document access","E2E opens signed SPL route for an approved record","Scheduling","Required"),
    ("Authorization","Unauthorized employee/site data never appears","Security","Required"),
    ("Regression","Existing attendance and payroll tests remain green","Engineering","Required"),
]
for i,row in enumerate(ops,1):
    for j,v in enumerate(row): sett(t[6],i,j,v)
alts = [
    ("Keep combined overtime","Requires no UI change.","Cannot reconcile mandatory and SPL time."),
    ("Use SPL planned duration","Simple document display.","Does not reflect actual attendance overlap."),
    ("Create a new SPL document viewer","Could tailor the visual flow.","Duplicates the signed approval document route."),
    ("Store derived SPL minutes","Fast reads after persistence.","Adds migration and stale-data risk for a read-only view."),
]
for i,row in enumerate(alts,1):
    for j,v in enumerate(row): sett(t[7],i,j,v)
miles = [
    ("M1","Policy result split and unit coverage","autoMinutes and splMinutes are disjoint."),
    ("M2","Attendance tabs and cell totals","Both views render with existing filters and scope."),
    ("M3","Signed SPL navigation","Approved cell opens the canonical document route."),
    ("M4","E2E and screenshot evidence","Required scenarios pass and artifacts are retained."),
]
for i,row in enumerate(miles,1):
    for j,v in enumerate(row): sett(t[8],i,j,v)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUTPUT)
print(OUTPUT)
