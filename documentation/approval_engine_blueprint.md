# Approval Engine Blueprint

Status snapshot: 17 April 2026

Legend:

- `[x]` selesai dan sudah terpasang di sistem
- `[~]` sudah ada fondasi / surface / sebagian runtime, tetapi belum end-to-end penuh
- `[ ]` masih backlog

## 1. Tujuan

Approval Engine HERO menjadi platform bersama untuk:

- Daily Activity
- Overtime
- Leave / Permission
- Daily Report
- HSE form
- Procurement / Request form
- Form custom lain yang akan terus bertambah

Prinsip utamanya tetap sama: sistem tidak boleh dibangun per-form secara hardcode. Yang tumbuh bersama sistem adalah template form, workflow approval, notification, reminder, inbox, preview, comment, dan audit trail.

## 2. Status Ringkas

### 2.1 Yang sudah aktif saat ini

- `[x]` Org Structure, Approval Matrix, dan Route Simulation menjadi fondasi resolver approver.
- `[x]` Submit Daily Activity memakai route engine dan menyimpan snapshot workflow.
- `[x]` Approval action `Approve`, `Reject`, `Revisi` aktif.
- `[x]` Daily Activity sudah pindah ke form template-driven pertama dengan progress, preview, draft, attachment URL, watcher, signature, GPS, dan supplemental field.
- `[x]` Approval Inbox workbench sudah mendukung:
  - preview request
  - attachment preview
  - comment thread
  - audit trail timeline
  - due-state / SLA visibility
  - workflow path
  - quick action
- `[x]` Request Center sudah menampilkan submitted, in review, need revision, approved, rejected, draft, dan cancelled.
- `[x]` Form Studio membaca runtime metadata dari template/version/section/field/options/validation/submission.
- `[x]` Workflow Studio membaca runtime metadata workflow template, version, condition, branch, step rule, notification rule, dan reminder rule.
- `[x]` Notification Center sudah ada untuk monitoring event, delivery, reminder queue, delegation queue, dan escalation queue.
- `[x]` Parallel approval dan any-one approval sudah masuk runtime route execution lewat `approvalMode` + step group yang memiliki `stepOrder` sama.

### 2.2 Fondasi schema dan migration

- `[x]` Schema foundation sudah ditambahkan ke codebase:
  - `formTemplates`
  - `formTemplateVersions`
  - `formTemplateSections`
  - `formTemplateFields`
  - `formFieldOptions`
  - `formValidationRules`
  - `formSubmissions`
  - `formSubmissionValues`
  - `workflowTemplates`
  - `workflowTemplateVersions`
  - `workflowConditions`
  - `workflowBranches`
  - `workflowStepRules`
  - `workflowNotificationRules`
  - `workflowReminderRules`
  - `approvalRequestActors`
  - `approvalComments`
  - `approvalAttachments`
  - `inboxItems`
  - `notificationEvents`
  - `notificationDeliveries`
  - `reminderJobs`
  - `requestStatusHistories`
  - `stepDecisionHistories`
- `[x]` Migration schema sudah digenerate:
  - `drizzle/0004_fat_lila_cheney.sql`
  - `drizzle/0005_fine_firedrake.sql`
- `[~]` Reminder dan notification sudah punya persistence + monitoring center, tetapi belum punya scheduler/worker pengiriman otomatis yang benar-benar berjalan di background.

### 2.3 Backlog utama yang tersisa

- `[ ]` Field builder visual drag-and-drop.
- `[ ]` Section builder visual.
- `[ ]` Validation rule builder visual.
- `[ ]` Attachment rule builder visual.
- `[ ]` Reminder scheduler / worker otomatis.
- `[ ]` Visual condition builder grouped `AND/OR`.
- `[ ]` Clone template UI.
- `[ ]` Expired lifecycle automation.

## 3. Prinsip Desain

### 3.1 Form dan Workflow harus dipisah

- `[x]` Prinsip ini dipertahankan.
- `[x]` Workflow saat ini diambil dari Org Structure + Approval Matrix + workflow template seed.
- `[x]` Form Template Engine sudah punya metadata runtime dan starter form Daily Activity.
- `[~]` Visual CRUD builder belum full no-code.

### 3.2 Semua rule harus versioned

- `[x]` Org structure dan approval matrix punya `effectiveFrom` / `effectiveTo`.
- `[x]` Approval request menyimpan snapshot route saat submit.
- `[x]` Form template memakai `formTemplateVersions`.
- `[x]` Workflow template memakai `workflowTemplateVersions`.
- `[~]` UI publish/rollback version belum full visual.

### 3.3 Approval request harus immutable-by-snapshot

- `[x]` Snapshot workflow tersimpan saat submit activity.
- `[x]` Snapshot form schema/payload tersimpan di `formSubmissions`.
- `[x]` Request lama tetap mengikuti route snapshot saat dibuat.
- `[~]` Generic request abstraction masih bridge dari `activities` + `approvals` untuk form pertama.

## 4. Capability Wajib

### 4.1 Form Template Engine

- `[x]` Form Category
  - remark: catalog category aktif di Form Studio.
- `[x]` Form Template
  - remark: template catalog tersimpan dan dibaca runtime.
- `[x]` Form Version
  - remark: `formTemplateVersions` aktif dan dipakai Daily Activity starter.
- `[~]` Field Builder
  - remark: field registry dan renderer aktif; visual drag-and-drop builder belum dibuat.
- `[~]` Section Builder
  - remark: section registry aktif; visual section designer belum dibuat.
- `[~]` Validation Rules
  - remark: table dan metadata validation aktif; visual rule editor belum dibuat.
- `[~]` Attachment Rules
  - remark: attachment field + persistence aktif; visual attachment rule builder belum dibuat.
- `[x]` Preview Mode
  - remark: preview sebelum submit dan preview approval sudah aktif.
- `[~]` Draft / Publish
  - remark: draft request aktif; publish status template ada, tetapi publish flow UI belum penuh.
- `[ ]` Clone Template

Tipe field minimum:

- `[x]` text
- `[x]` textarea
- `[x]` number
- `[x]` date
- `[x]` datetime
- `[x]` select
- `[x]` multi select
- `[x]` checkbox
- `[x]` radio
- `[x]` people picker
- `[x]` org unit picker
- `[x]` file upload
- `[x]` image upload
- `[x]` signature
- `[x]` calculated field

Remark:

- Field type minimum sudah didukung oleh renderer Daily Activity template-driven.
- Yang belum selesai adalah visual builder no-code untuk admin membuat field/section baru dari UI.

### 4.2 Approval Workflow Engine

- `[x]` Approve
- `[x]` Reject
- `[x]` Revisi
- `[x]` Comment
  - remark: comment tampil di thread dan disinkronkan ke `approvalComments`.
- `[x]` Preview
- `[x]` Inbox
- `[~]` Reminder
  - remark: due-state, `reminderJobs`, dan Notification Center aktif; scheduler otomatis belum ada.
- `[x]` Audit Trail
- `[x]` Single Approval
- `[x]` Multi Approval
- `[x]` Sequential Approval
- `[x]` Parallel Approval
  - remark: step dengan `stepOrder` sama dan mode `parallel_all` diproses sebagai satu group.
- `[x]` Any-one Approval
  - remark: mode `parallel_any` / `any_one` akan skip sibling pending saat satu approver approve.
- `[~]` Delegate
  - remark: delegate capability ada di org node/route metadata; UI delegation operation belum full.
- `[x]` Fallback
- `[x]` Escalation
- `[x]` SLA per step
- `[x]` Due date per step
  - remark: due date tersimpan di `approvalRequestActors` dan `inboxItems`.

### 4.3 Notification Engine

- `[x]` email setting
  - remark: email delivery log/settings page tersedia.
- `[x]` in-app notification persistence
  - remark: `notificationEvents` dan `notificationDeliveries` channel `in_app` aktif dan tampil di Notification Center.
- `[~]` in-app notification live bell
  - remark: header bell masih memakai mock notification; belum membaca delivery runtime.
- `[x]` reminder before due persistence
  - remark: `reminderJobs` otomatis dibuat dari SLA.
- `[x]` reminder overdue persistence
  - remark: overdue reminder job otomatis dibuat dari SLA.
- `[~]` escalation notification
  - remark: escalation metadata dan queue visibility ada; delivery worker belum khusus.
- `[~]` CC / watcher
  - remark: watcher field dan notification rule seed ada; delivery ke watcher belum full.
- `[x]` notif ke requester
  - remark: decision event requester dibuat saat workflow disinkronkan.
- `[x]` notif ke approver berikutnya
  - remark: assignment event approver dibuat saat inbox item dibuat.
- `[~]` notif ke admin workflow
  - remark: rule seed `workflow_admin` ada; delivery operasional belum full.

### 4.4 Condition Logic Engine

Rule yang sudah didukung runtime saat ini:

- `[x]` jika `department = ...`
- `[x]` jika `site = ...`
- `[x]` jika `overtime > threshold` / range overtime
- `[x]` jika `priority = ...`
- `[x]` jika `activityType = ...`

Rule yang belum:

- `[ ]` jika `nominal > threshold`
- `[ ]` jika ada attachment tertentu

Operator:

- `[x]` `=`
- `[x]` `>=`
- `[x]` `<=`
- `[~]` `!=`
  - remark: table condition sudah fleksibel, tetapi runtime resolver generic belum memakai semua operator.
- `[~]` `>`
- `[~]` `<`
- `[~]` `contains`
- `[~]` `in`
- `[~]` `is empty`
- `[~]` `is not empty`

Kombinasi rule:

- `[x]` implicit AND via matrix scope
- `[~]` OR visual builder
  - remark: entity `workflowConditions.logicalJoin` ada; UI visual builder belum dibuat.
- `[~]` grouped condition builder
  - remark: `parentConditionId`, `logicalJoin`, dan group label siap di schema/studio.

## 5. Mode Workflow

### 5.1 Org Template Mode

- `[x]` aktif
- remark: route diambil dari struktur organisasi + approval matrix + assignment node.

### 5.2 Manual Workflow Mode

- `[~]` sebagian aktif
- remark: Approval Matrix editor bisa menyusun step manual, fallback, escalation, SLA, dan approval mode.
- remark: custom workflow full per-template dan ad-hoc actor selection belum selesai sebagai studio terpisah.

Rekomendasi HERO tetap valid:

- `[x]` `Org Structure` sebagai fondasi actor resolution.
- `[~]` `Custom Structure` untuk workflow manual dikembangkan dari Approval Matrix + Workflow Studio foundation.

## 6. Struktur Modul

### 6.1 Master Data

- `[x]` live
- isi: Site, Department, Section, Position, Org Structure, Org Node Assignment, Approval Matrix, Route Simulation, Approval Mode.

### 6.2 Form Studio

- `[x]` live sebagai runtime catalog/readiness module.
- `[~]` backlog: visual builder, version editor, template clone, publish flow penuh.

### 6.3 Workflow Studio

- `[x]` live sebagai overview/control room berbasis workflow runtime metadata.
- `[~]` backlog: branch condition visual, reminder rule builder visual, notification rule builder visual.

### 6.4 Inbox

- `[x]` live
- isi yang sudah ada:
  - approval queue
  - status badge
  - due-state
  - quick action
  - quick preview
  - attachment preview
  - workflow path
  - comment thread
  - audit trail

### 6.5 Request Center

- `[x]` live
- isi yang sudah ada:
  - draft
  - submitted
  - in review
  - need revision
  - approved
  - rejected
  - cancelled
  - cancel draft action

### 6.6 Audit & Monitoring

- `[x]` sebagian besar live untuk approval engine runtime.
- yang sudah ada:
  - audit trail per request di Approval Inbox
  - audit log global existing
  - email delivery log existing
  - Notification Center
  - reminder job monitoring
  - inbox delegation/escalation visibility
- yang belum:
  - worker SLA breach dedicated
  - alerting otomatis dari scheduler

## 7. Data Model

Fondasi HERO yang sudah aktif:

- `[x]` `orgChartStructures`
- `[x]` `orgChartNodes`
- `[x]` `orgNodeAssignments`
- `[x]` `approvalMatrices`
- `[x]` `approvalMatrixSteps`
- `[x]` `approvals`

### 7.1 Form Template Layer

- `[x]` `formTemplates`
- `[x]` `formTemplateVersions`
- `[x]` `formTemplateSections`
- `[x]` `formTemplateFields`
- `[x]` `formFieldOptions`
- `[x]` `formValidationRules`

### 7.2 Workflow Layer

- `[x]` `workflowTemplates`
- `[x]` `workflowTemplateVersions`
- `[x]` `workflowConditions`
- `[x]` `workflowBranches`
- `[x]` `workflowStepRules`
- `[x]` `workflowNotificationRules`
- `[x]` `workflowReminderRules`

### 7.3 Transaction Layer

- `[x]` `formSubmissions`
- `[x]` `formSubmissionValues`
- `[~]` `approvalRequests`
  - remark: saat ini abstraction generic direpresentasikan oleh `formSubmissions` + `activities` + `approvals`.
- `[~]` `approvalRequestSteps`
  - remark: saat ini step request direpresentasikan lewat multi-row `approvals` + `approvalRequestActors`.
- `[x]` `approvalRequestActors`
- `[x]` `approvalComments`
- `[x]` `approvalAttachments`

### 7.4 Delivery & Inbox Layer

- `[x]` `inboxItems`
- `[x]` `notificationEvents`
- `[x]` `notificationDeliveries`
- `[x]` `reminderJobs`

### 7.5 Audit Layer

- `[x]` `requestStatusHistories`
- `[~]` `auditTrails`
  - remark: global audit log sudah ada; request-level trail memakai `requestStatusHistories` + timeline approval.
- `[x]` `stepDecisionHistories`

## 8. Status Lifecycle

### 8.1 Request Status

- `[x]` `draft`
- `[x]` `submitted`
- `[x]` `in_review`
- `[x]` `needs_revision`
- `[x]` `approved`
- `[x]` `rejected`
- `[x]` `cancelled`
- `[ ]` `expired`

### 8.2 Step Status

- `[~]` `waiting`
  - remark: waiting terlihat sebagai implied state sebelum next group dibuat.
- `[x]` `pending`
- `[x]` `approved`
- `[x]` `rejected`
- `[x]` `revised`
- `[x]` `skipped`
  - remark: dipakai saat `parallel_any` sudah dipenuhi satu approver.
- `[~]` `delegated`
  - remark: capability ada, operational delegation flow belum full.
- `[ ]` `expired`

## 9. UX

### 9.1 Di Halaman Form

- `[x]` header form template-driven
- `[x]` form progress
- `[x]` preview sebelum submit
- `[x]` submit sebagai draft
- `[x]` submit final
- `[~]` history revisi
  - remark: revisi sudah ada di lifecycle approval, tetapi requester-facing revision workspace belum dipisah.

### 9.2 Di Halaman Approval

- `[x]` preview data form
- `[x]` attachment preview
- `[x]` comment thread
- `[x]` tombol `Approve`
- `[x]` tombol `Reject`
- `[x]` tombol `Revisi`
- `[x]` daftar approver berikutnya / workflow path
- `[x]` SLA badge / due-state
- `[x]` audit trail singkat

### 9.3 Di Inbox

- `[x]` urgent first
  - remark: overdue dan due soon diprioritaskan di sort order.
- `[x]` due soon
- `[x]` overdue
- `[~]` delegation queue
  - remark: persistence dan monitoring center ada, flow delegation manual belum full.
- `[~]` escalation queue
  - remark: persistence dan monitoring center ada, worker escalation otomatis belum full.

## 10. Daily Activity Sebagai Form Pertama

Status:

- `[x]` Daily Activity sudah menjadi form pertama yang terhubung ke approval engine.
- `[x]` Daily Activity sudah template-driven melalui `ActivityTemplateForm` + template metadata.
- `[x]` Volume tinggi dan approval path-nya dipakai untuk menguji inbox, preview, comment, attachment, notification, reminder, dan audit trail.

Field minimum Daily Activity:

- `[x]` tanggal kerja
- `[x]` shift
- `[x]` site
- `[x]` department
- `[x]` section
- `[x]` unit / area
- `[x]` activity type
- `[x]` deskripsi kerja
- `[x]` start time
- `[x]` end time
- `[x]` overtime
- `[x]` attachment foto
- `[x]` attachment dokumen
- `[x]` remark

Tambahan yang disarankan:

- `[x]` kategori risiko
- `[x]` reference WO / ticket
- `[x]` manpower involved
- `[x]` checklist completion
- `[x]` watcher / CC
- `[x]` signature requester
- `[x]` location pin / GPS jika relevan

## 11. Roadmap Implementasi

### Phase 1

- `[x]` stabilkan Org Structure + Approval Matrix + Route Simulation
- `[x]` semua activity submit memakai route engine
- `[x]` action approval: approve / reject / revisi
- `[x]` snapshot workflow saat submit

### Phase 2

- `[x]` bangun Form Template Engine foundation
- `[x]` Daily Activity pindah ke template-driven form pertama
- `[x]` inbox approval standar
- `[x]` comment + preview + audit trail penuh

### Phase 3

- `[~]` notification engine
  - remark: persistence + monitoring center aktif; real sender/worker belum.
- `[~]` reminder engine
  - remark: rule + job queue aktif; scheduler otomatis belum.
- `[x]` email settings / email log tersedia
- `[x]` SLA monitoring

### Phase 4

- `[x]` multi approval / parallel approval runtime
- `[~]` rule builder foundation
  - remark: schema dan studio visibility aktif; visual builder belum.
- `[~]` dashboard monitoring approval bottleneck
  - remark: Notification Center + SLA metrics ada; bottleneck analytics khusus belum.

## 12. Rekomendasi Final

Arsitektur terbaik untuk HERO tetap:

1. `Org Structure` menjadi fondasi actor resolution.
2. `Approval Matrix` menjadi rule penentu kapan workflow dipakai.
3. `Form Template Engine` menjadi lapisan di atasnya agar Daily Activity dan form lain tumbuh tanpa hardcode.
4. `Workflow Studio` menjadi control room untuk rule, condition, notification, dan reminder.
5. `Inbox + Request Center + Notification + Audit` menjadi experience layer yang dipakai semua form.

Status akhir saat ini:

- `[x]` core approval engine sudah siap sebagai pusat workflow Daily Activity.
- `[x]` experience layer utama sudah tersambung: Inbox, Request Center, Form Studio, Workflow Studio, Notification Center.
- `[x]` generic form engine sudah punya schema, seed data, metadata renderer, draft, submission, attachment, and audit artifacts.
- `[~]` no-code builder advanced masih fase berikutnya.
- `[~]` background worker reminder/notification masih fase berikutnya.

Kesimpulan:

- Blueprint ini sudah berubah dari desain menjadi implementasi runtime utama.
- Bagian yang selesai sudah diberi centang `[x]`.
- Bagian yang masih partial diberi `[~]` agar mudah diprioritaskan tanpa mengklaim fitur yang belum benar-benar end-to-end.
