# Graph Report - HERO  (2026-06-01)

## Corpus Check
- 535 files · ~845,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2237 nodes · 3258 edges · 77 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 544 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 133|Community 133]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 55 edges
2. `ensureHeroGovernanceSeedData()` - 50 edges
3. `ensureHeroSeedData()` - 45 edges
4. `logAuditEvent()` - 25 edges
5. `ensureDailyActivitySeedData()` - 25 edges
6. `ensureSchedulingTimesheetTables()` - 23 edges
7. `ensureWarehouseRepairTables()` - 21 edges
8. `manageSecurityUserAction()` - 21 edges
9. `requireSchedulingTimesheetAccess()` - 19 edges
10. `revalidateAdminSurfaces()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `uploadFile()` --calls--> `handleFileUpload()`  [INFERRED]
  app\actions\upload.ts → components\safety-inspections\inspection-form-dialog.tsx
- `addApprovalCommentAction()` --calls--> `appendApprovalNoteEntry()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\approval-notes.ts
- `manageApprovalMatrixAction()` --calls--> `handleSave()`  [INFERRED]
  app\dashboard\master-data\actions.ts → components\approval-matrix-manager.tsx
- `formatMonthKey()` --calls--> `String()`  [INFERRED]
  app\dashboard\repair-retread\wip-repair\dashboard\_components\wip-repair-dashboard-client.tsx → app\dashboard\timesheet\timesheet\page.tsx
- `String()` --calls--> `fmtDate()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → app\dashboard\warehouse-repair\_components\warehouse-repair-client.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (131): ActivityRouteDepartmentSectionFields(), addApprovalCommentAction(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen(), buildDefaultUserManagementPassword(), bulkProvisionAuthAccountsAction() (+123 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (83): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), handleDelete(), handleSubmit(), updateNavbarThemeAction(), DashboardLayout(), getExistingPwaPushSettings() (+75 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (80): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+72 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (57): notifyEmployeeForPointUpdate(), testPwaPushSettingsAction(), MobileExecutivePage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive() (+49 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (50): buildAttendanceNote(), buildLocationNote(), dayNumberFromDate(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee() (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (40): buildRiskFields(), deleteHiradcEntryAction(), deleteHiradcRegisterAction(), failure(), importHiradcAction(), readId(), requireStr(), revalidateHiradc() (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (32): SafetyDataPage(), HiradcPage(), getHiradcAccess(), getHiradcData(), getHiradcReport(), uniqueSorted(), HiradcReportPage(), getCurrentEmployeeAccessRole() (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (30): bulkDeleteRepairMasterItems(), cleanText(), deleteRepairMasterItem(), deleteRepairMasterSite(), ensureDefaultRepairSites(), ensureRepairMasterTables(), getRepairMasterData(), getStockSapRows() (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (36): codePrefix(), createWarehouseRepairInbound(), createWarehouseRepairOutbound(), deleteWarehouseRepairInbound(), deleteWarehouseRepairItem(), deleteWarehouseRepairOutbound(), deleteWarehouseRepairType(), deleteWarehouseRepairUnit() (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (21): buildSchedule(), dateRangeDays(), dayFromDate(), defaultPositionOnSite(), employeeSnLabel(), extractSiteNameLocal(), isEmploymentPositionLabel(), isLeadershipPosition() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (30): computeChecklistScore(), createChecklistTemplate(), createDailyChecklistFromTemplate(), deleteChecklistTemplate(), deleteDailyChecklist(), getActor(), getChecklistAuditLogs(), getChecklistTemplateRevisionDetail() (+22 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (28): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (32): FormStudioPage(), buildRequestNumber(), cancelFormSubmissionDraft(), cloneFormTemplateVersion(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), createWorkflowCondition() (+24 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (29): main(), periodForFile(), buildAttendanceImportPreview(), buildEmployeeMatcher(), buildValidationFlags(), emptyValidationSummary(), minutesFromTime(), normalizeAttendanceImportIdentity() (+21 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (27): ApprovalPage(), MobileApprovalPage(), appendApprovalNoteEntry(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow() (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (18): createMasterGoods(), createMasterLocation(), createMasterRecipient(), createMasterSite(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), deleteMasterSite() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (19): errorResponse(), POST(), savePhoto(), cosineSimilarity(), validateEmbedding(), extractServerFaceEmbedding(), getFaceApi(), warmupServerFaceApi() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (19): getWipRepairData(), getWipRepairInvoiceMappings(), getWipRepairPmoMappings(), getWipRepairWorkOrderDetails(), WipRepairDashboardContent(), buildWipRepairDashboardData(), getDetailLookupKeys(), getHeaderDetailLookupKey() (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.1
Nodes (14): exportVisibleUsers(), buildExcelHtml(), compareCellValues(), downloadText(), exportRowsToFile(), matchesDataFilter(), matchesDateRange(), normalizeFileName() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), handleSimulate(), matrixToEditable(), toDateTimeLocalValue(), runSimulation() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.26
Nodes (22): decimalText(), deleteImportedWorkbookRows(), getRows(), importCertifications(), importIncidentReports(), importManHours(), importMonthlyIncident(), importMonthlyManHours() (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (11): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleFaceVerificationFailure(), handleSubmit(), reopenCameraForRetry() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (9): createSafetyInspection(), deleteSafetyInspection(), getSafetyInspections(), updateSafetyInspection(), handleSubmit(), SafetyInspectionsPage(), handleDelete(), handleFileUpload() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (14): formatDate(), formatMinutes(), formatMonthKey(), formatNumber(), getDetailLookupKeys(), getHeaderDetailLookupKey(), hasActualWorkOrder(), isEmptyWorkOrder() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (10): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), buildShortCodeRecords(), loadCsv() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (15): buildWipRepairSapCopyText(), cleanText(), convertQuantityToMasterUom(), formatSapQuantity(), getLookupTokens(), getMaterialNameTokens(), isValidMaterialNumber(), makeMasterMaterialLookup() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.54
Nodes (15): failure(), manageSafetyCertificationAction(), manageSafetyIncidentReportAction(), manageSafetyIncidentSummaryMonthlyAction(), manageSafetyIncidentSummaryYearlyAction(), manageSafetyManHoursAction(), manageSafetyMonthlyManHoursAction(), manageSafetyPerformanceAction() (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (11): formatDurationLabel(), getDailyActivitySessionDocumentData(), chunk(), drawDocumentHeader(), drawSignatureArea(), drawWorkTable(), GET(), loadLetterheadImage() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (9): POST(), requireTimesheetAccess(), detectSiteTransfer(), determineDailyStatus(), formatOTHours(), mergeOTAndSPLRecords(), addSummaryTable(), createSiteSheet() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.42
Nodes (8): getDetailGroupingKeys(), getDetailLookupKeys(), getNormalizedText(), getWorkOrderDetailKey(), isWaitingWorkOrder(), normalizeDetailJob(), normalizeTireSn(), normalizeValue()

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (5): fetchIndonesiaRegionOptions(), loadDistricts(), loadProvinces(), loadRegencies(), loadVillages()

### Community 37 - "Community 37"
Cohesion: 0.36
Nodes (8): calcOvertimeHours(), centerX(), drawCell(), embedLogo(), formatMoney(), formatPeriodLabel(), generateOvertimeRecordPdf(), generateSiteAllowancePdf()

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (8): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData()

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 40 - "Community 40"
Cohesion: 0.38
Nodes (9): capturePage(), getDynamicRoutes(), getOriginalPasswordHash(), login(), main(), restorePassword(), routeToFileName(), setTemporaryPassword() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (1): fmtDate()

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 43 - "Community 43"
Cohesion: 0.42
Nodes (8): calcDuration(), centerX(), drawCell(), formatDate(), formatPeriodLabel(), formatTime(), generateDailyActivityPdf(), getDayName()

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 48 - "Community 48"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 49 - "Community 49"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 50 - "Community 50"
Cohesion: 0.39
Nodes (6): normalizedSlocSql(), normalizeSloc(), normalizeSlocForSearch(), buildFallbackUrl(), fetchFallbackStockMaterialSap(), GET()

### Community 52 - "Community 52"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 60 - "Community 60"
Cohesion: 0.53
Nodes (4): DELETE(), GET(), PATCH(), requireCentralServiceAccess()

### Community 61 - "Community 61"
Cohesion: 0.47
Nodes (4): handleDelete(), handleSubmit(), manageBadgeAction(), manageLevelAction()

### Community 63 - "Community 63"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 65 - "Community 65"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 66 - "Community 66"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 67 - "Community 67"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 70 - "Community 70"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 71 - "Community 71"
Cohesion: 0.6
Nodes (3): compactBrand(), getFuzzyBrandMatch(), normalizeWipRepairBrand()

### Community 72 - "Community 72"
Cohesion: 0.83
Nodes (3): GET(), POST(), requireCentralServiceAccess()

### Community 73 - "Community 73"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 81 - "Community 81"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 93 - "Community 93"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 94 - "Community 94"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 95 - "Community 95"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 98 - "Community 98"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (2): buildSnLookupVariants(), POST()

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (2): POST(), requireCentralServiceAccess()

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (2): POST(), requireCentralServiceAccess()

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (2): formatAuditValue(), formatSeverity()

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (2): calculateEAR(), euclideanDistance()

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

## Knowledge Gaps
- **Thin community `Community 41`** (9 nodes): `warehouse-repair-client.tsx`, `ActionIconButton()`, `Field()`, `fmtDate()`, `PageShell()`, `reload()`, `save()`, `statusLabel()`, `today()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (3 nodes): `route.ts`, `buildSnLookupVariants()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (3 nodes): `route.ts`, `POST()`, `requireCentralServiceAccess()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (3 nodes): `route.ts`, `POST()`, `requireCentralServiceAccess()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (3 nodes): `formatAuditValue()`, `formatSeverity()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (3 nodes): `face-camera.tsx`, `calculateEAR()`, `euclideanDistance()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (3 nodes): `downloadFile()`, `main()`, `download-face-models.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 0` to `Community 1`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 24`, `Community 28`, `Community 31`, `Community 32`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 43`, `Community 49`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 11`, `Community 21`, `Community 23`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 19`, `Community 11`, `Community 6`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 53 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `nextCode()`) actually correct?**
  _`String()` has 53 INFERRED edges - model-reasoned connections that need verification._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `logAuditEvent()` (e.g. with `createChecklistTemplate()` and `updateChecklistTemplate()`) actually correct?**
  _`logAuditEvent()` has 24 INFERRED edges - model-reasoned connections that need verification._