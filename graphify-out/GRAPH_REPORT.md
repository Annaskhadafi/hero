# Graph Report - HERO  (2026-06-02)

## Corpus Check
- 613 files · ~905,441 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2623 nodes · 3732 edges · 87 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 618 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 155|Community 155]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 60 edges
2. `ensureHeroGovernanceSeedData()` - 52 edges
3. `ensureHeroSeedData()` - 45 edges
4. `logAuditEvent()` - 25 edges
5. `ensureDailyActivitySeedData()` - 25 edges
6. `ensureSchedulingTimesheetTables()` - 23 edges
7. `ensureWarehouseRepairTables()` - 21 edges
8. `manageSecurityUserAction()` - 21 edges
9. `requireSchedulingTimesheetAccess()` - 19 edges
10. `revalidateAdminSurfaces()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `isExpiredRecord()` --calls--> `Boolean()`  [INFERRED]
  app\actions\disciplinary.ts → components\email-delivery-log-table.tsx
- `uploadFile()` --calls--> `handleFileUpload()`  [INFERRED]
  app\actions\upload.ts → app\dashboard\hse\incident-report\incident-dialogs.tsx
- `uploadFile()` --calls--> `handleFileUpload()`  [INFERRED]
  app\actions\upload.ts → app\dashboard\hse\inventaris\inventaris-dialogs.tsx
- `formatMonthKey()` --calls--> `String()`  [INFERRED]
  app\dashboard\repair-retread\wip-repair\dashboard\_components\wip-repair-dashboard-client.tsx → app\dashboard\timesheet\timesheet\page.tsx
- `String()` --calls--> `fmtDate()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → app\dashboard\warehouse-repair\_components\warehouse-repair-client.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (124): ActivityRouteDepartmentSectionFields(), handleDelete(), handleSubmit(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen(), buildDefaultUserManagementPassword() (+116 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (100): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), handleSimulate() (+92 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (82): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+74 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (57): notifyEmployeeForPointUpdate(), testPwaPushSettingsAction(), MobileExecutivePage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive() (+49 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (44): SafetyDataPage(), HiradcPage(), getHiradcAccess(), getHiradcData(), getHiradcReport(), uniqueSorted(), HiradcReportPage(), createIncidentRecord() (+36 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (39): buildDisciplinaryWhere(), buildSearchClause(), categoryValues(), createDisciplinaryAction(), createViolationCategory(), deleteDisciplinaryAction(), deleteViolationCategory(), disciplinaryValues() (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (44): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), calculateExpirationDate(), createHseInventory(), deleteHseInventory(), getHseInventories(), getHseUserEmails() (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (40): buildRiskFields(), deleteHiradcEntryAction(), deleteHiradcRegisterAction(), failure(), importHiradcAction(), readId(), requireStr(), revalidateHiradc() (+32 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (32): submitSafetyInduction(), createSafetyInspection(), deleteSafetyInspection(), getSafetyInspections(), updateSafetyInspection(), uploadFile(), GET(), handleSubmit() (+24 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (36): codePrefix(), createWarehouseRepairInbound(), createWarehouseRepairOutbound(), deleteWarehouseRepairInbound(), deleteWarehouseRepairItem(), deleteWarehouseRepairOutbound(), deleteWarehouseRepairType(), deleteWarehouseRepairUnit() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (30): bulkDeleteRepairMasterItems(), cleanText(), deleteRepairMasterItem(), deleteRepairMasterSite(), ensureDefaultRepairSites(), ensureRepairMasterTables(), getRepairMasterData(), getStockSapRows() (+22 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (21): buildSchedule(), dateRangeDays(), dayFromDate(), defaultPositionOnSite(), employeeSnLabel(), extractSiteNameLocal(), isEmploymentPositionLabel(), isLeadershipPosition() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (30): computeChecklistScore(), createChecklistTemplate(), createDailyChecklistFromTemplate(), deleteChecklistTemplate(), deleteDailyChecklist(), getActor(), getChecklistAuditLogs(), getChecklistTemplateRevisionDetail() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (28): buildAttendanceNote(), buildLocationNote(), dayNumberFromDate(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (28): addDays(), assertValidId(), createCertificate(), deleteCertificate(), enrichCertificate(), getCertificates(), getCertificateStats(), getCertificateTypes() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (17): createEmployee(), deleteEmployee(), getEmployeeFilterOptions(), getEmployeesForContract(), updateEmployee(), getLeaveRequests(), getLeaveStats(), getLeaveTypes() (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (29): main(), periodForFile(), buildAttendanceImportPreview(), buildEmployeeMatcher(), buildValidationFlags(), emptyValidationSummary(), minutesFromTime(), normalizeAttendanceImportIdentity() (+21 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (29): createFormFieldAction(), createFormSectionAction(), FormStudioPage(), buildRequestNumber(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), ensureApprovalBlueprintSeedData() (+21 more)

### Community 18 - "Community 18"
Cohesion: 0.1
Nodes (30): ApprovalPage(), MobileApprovalPage(), addApprovalCommentAction(), appendApprovalNoteEntry(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview() (+22 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (18): createMasterGoods(), createMasterLocation(), createMasterRecipient(), createMasterSite(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), deleteMasterSite() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (19): errorResponse(), POST(), savePhoto(), cosineSimilarity(), validateEmbedding(), extractServerFaceEmbedding(), getFaceApi(), warmupServerFaceApi() (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (19): getWipRepairData(), getWipRepairInvoiceMappings(), getWipRepairPmoMappings(), getWipRepairWorkOrderDetails(), WipRepairDashboardContent(), buildWipRepairDashboardData(), getDetailLookupKeys(), getHeaderDetailLookupKey() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.1
Nodes (13): exportVisibleUsers(), buildExcelHtml(), compareCellValues(), downloadText(), exportRowsToFile(), matchesDataFilter(), normalizeFileName(), normalizeFilterValue() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (22): decimalText(), deleteImportedWorkbookRows(), getRows(), importCertifications(), importIncidentReports(), importManHours(), importMonthlyIncident(), importMonthlyManHours() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (21): acknowledgePerformanceReview(), addInitialKpis(), addPerformanceKpi(), createPerformanceCycle(), createPerformanceReview(), deletePerformanceCycle(), deletePerformanceKpi(), getPerformanceCycles() (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (13): fetchIndonesiaRegionOptions(), loadDistricts(), loadProvinces(), loadRegencies(), loadVillages(), buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (11): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleFaceVerificationFailure(), handleSubmit(), reopenCameraForRetry() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (14): formatDate(), formatMinutes(), formatMonthKey(), formatNumber(), getDetailLookupKeys(), getHeaderDetailLookupKey(), hasActualWorkOrder(), isEmptyWorkOrder() (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (11): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), parseTrainingRecordCsv(), buildShortCodeRecords() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (7): getAllDepartments(), getOnboardingRecords(), getOnboardingStats(), getOnboardingTemplates(), recalculateProgress(), updateOnboardingTask(), OnboardingPage()

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (15): buildWipRepairSapCopyText(), cleanText(), convertQuantityToMasterUom(), formatSapQuantity(), getLookupTokens(), getMaterialNameTokens(), isValidMaterialNumber(), makeMasterMaterialLookup() (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (4): getCandidates(), getRecruitments(), getRecruitmentStats(), RecruitmentPage()

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (9): POST(), requireTimesheetAccess(), detectSiteTransfer(), determineDailyStatus(), formatOTHours(), mergeOTAndSPLRecords(), addSummaryTable(), createSiteSheet() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.54
Nodes (15): failure(), manageSafetyCertificationAction(), manageSafetyIncidentReportAction(), manageSafetyIncidentSummaryMonthlyAction(), manageSafetyIncidentSummaryYearlyAction(), manageSafetyManHoursAction(), manageSafetyMonthlyManHoursAction(), manageSafetyPerformanceAction() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (11): formatDurationLabel(), getDailyActivitySessionDocumentData(), chunk(), drawDocumentHeader(), drawSignatureArea(), drawWorkTable(), GET(), loadLetterheadImage() (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (9): onSubmit(), handleDelete(), handleEdit(), handlePreview(), deleteJsa(), getJsaById(), getJsaList(), saveJsa() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.42
Nodes (8): getDetailGroupingKeys(), getDetailLookupKeys(), getNormalizedText(), getWorkOrderDetailKey(), isWaitingWorkOrder(), normalizeDetailJob(), normalizeTireSn(), normalizeValue()

### Community 43 - "Community 43"
Cohesion: 0.36
Nodes (8): calcOvertimeHours(), centerX(), drawCell(), embedLogo(), formatMoney(), formatPeriodLabel(), generateOvertimeRecordPdf(), generateSiteAllowancePdf()

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (8): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData()

### Community 45 - "Community 45"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 46 - "Community 46"
Cohesion: 0.38
Nodes (9): capturePage(), getDynamicRoutes(), getOriginalPasswordHash(), login(), main(), restorePassword(), routeToFileName(), setTemporaryPassword() (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (1): fmtDate()

### Community 48 - "Community 48"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 49 - "Community 49"
Cohesion: 0.42
Nodes (8): calcDuration(), centerX(), drawCell(), formatDate(), formatPeriodLabel(), formatTime(), generateDailyActivityPdf(), getDayName()

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 53 - "Community 53"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 54 - "Community 54"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 55 - "Community 55"
Cohesion: 0.39
Nodes (6): normalizedSlocSql(), normalizeSloc(), normalizeSlocForSearch(), buildFallbackUrl(), fetchFallbackStockMaterialSap(), GET()

### Community 56 - "Community 56"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 59 - "Community 59"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 61 - "Community 61"
Cohesion: 0.43
Nodes (4): draw(), ensureCanvasSize(), getCoordinates(), startDrawing()

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 69 - "Community 69"
Cohesion: 0.53
Nodes (4): DELETE(), GET(), PATCH(), requireCentralServiceAccess()

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 73 - "Community 73"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 74 - "Community 74"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 75 - "Community 75"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 76 - "Community 76"
Cohesion: 0.6
Nodes (3): getOrgChartData(), getOrgChartStats(), OrgChartPage()

### Community 84 - "Community 84"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 85 - "Community 85"
Cohesion: 0.6
Nodes (3): compactBrand(), getFuzzyBrandMatch(), normalizeWipRepairBrand()

### Community 86 - "Community 86"
Cohesion: 0.83
Nodes (3): buildSnLookupVariants(), POST(), snMatches()

### Community 87 - "Community 87"
Cohesion: 0.83
Nodes (3): GET(), POST(), requireCentralServiceAccess()

### Community 88 - "Community 88"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 92 - "Community 92"
Cohesion: 0.5
Nodes (2): getTechnicalEngineers(), TechnicalEngineerPage()

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 100 - "Community 100"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 112 - "Community 112"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 113 - "Community 113"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 114 - "Community 114"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 116 - "Community 116"
Cohesion: 0.83
Nodes (3): main(), parseInsertValues(), safeDate()

### Community 117 - "Community 117"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (2): POST(), requireCentralServiceAccess()

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (2): POST(), requireCentralServiceAccess()

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (2): formatAuditValue(), formatSeverity()

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (2): calculateEAR(), euclideanDistance()

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (2): getHcAccess(), requireHcPermission()

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

## Knowledge Gaps
- **Thin community `Community 47`** (9 nodes): `warehouse-repair-client.tsx`, `ActionIconButton()`, `Field()`, `fmtDate()`, `PageShell()`, `reload()`, `save()`, `statusLabel()`, `today()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (4 nodes): `getTechnicalEngineers()`, `technical-engineer.ts`, `page.tsx`, `TechnicalEngineerPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (3 nodes): `route.ts`, `POST()`, `requireCentralServiceAccess()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (3 nodes): `route.ts`, `POST()`, `requireCentralServiceAccess()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (3 nodes): `formatAuditValue()`, `formatSeverity()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (3 nodes): `face-camera.tsx`, `calculateEAR()`, `euclideanDistance()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (3 nodes): `getHcAccess()`, `requireHcPermission()`, `hc-rbac.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (3 nodes): `downloadFile()`, `main()`, `download-face-models.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 0` to `Community 1`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 16`, `Community 19`, `Community 20`, `Community 23`, `Community 26`, `Community 28`, `Community 30`, `Community 34`, `Community 35`, `Community 39`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 49`, `Community 56`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 58 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `disciplinaryValues()`) actually correct?**
  _`String()` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `logAuditEvent()` (e.g. with `createChecklistTemplate()` and `updateChecklistTemplate()`) actually correct?**
  _`logAuditEvent()` has 24 INFERRED edges - model-reasoned connections that need verification._