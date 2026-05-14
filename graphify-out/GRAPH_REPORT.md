# Graph Report - HERO  (2026-05-14)

## Corpus Check
- 442 files · ~731,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1842 nodes · 2552 edges · 65 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 440 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]

## God Nodes (most connected - your core abstractions)
1. `ensureHeroGovernanceSeedData()` - 50 edges
2. `String()` - 47 edges
3. `ensureHeroSeedData()` - 45 edges
4. `ensureDailyActivitySeedData()` - 25 edges
5. `ensureSchedulingTimesheetTables()` - 22 edges
6. `requireSchedulingTimesheetAccess()` - 19 edges
7. `revalidateAdminSurfaces()` - 18 edges
8. `manageSecurityUserAction()` - 18 edges
9. `revalidateDailyActivitySurfaces()` - 17 edges
10. `submitDailyActivityAction()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `importActivityLibraryAction()` --calls--> `parseActivityLibraryInteger()`  [INFERRED]
  app\dashboard\activity-hub\actions.ts → lib\activity-library-import.ts
- `importActivityLibraryAction()` --calls--> `parseActivityLibraryBoolean()`  [INFERRED]
  app\dashboard\activity-hub\actions.ts → lib\activity-library-import.ts
- `manageApprovalMatrixAction()` --calls--> `handleSave()`  [INFERRED]
  app\dashboard\master-data\actions.ts → components\approval-matrix-manager.tsx
- `String()` --calls--> `handleSubmit()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\cargo-manifest-panels.tsx
- `String()` --calls--> `employeeSnLabel()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\scheduling-timesheet-workspace.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (122): ActivityRouteDepartmentSectionFields(), handleDelete(), handleSubmit(), addApprovalCommentAction(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen() (+114 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (99): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), handleSimulate(), runSimulation(), fetchIndonesiaRegionOptions(), handleDelete(), handleSubmit() (+91 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (76): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+68 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (37): notifyEmployeeForPointUpdate(), testPwaPushSettingsAction(), getMobileNotifications(), getMobileNotificationSettings(), buildNotificationScope(), buildRecipientFilter(), clearNotifications(), getRecipientNotifications() (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (30): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (20): buildSchedule(), dateRangeDays(), dayFromDate(), defaultPositionOnSite(), employeeSnLabel(), isEmploymentPositionLabel(), isLeadershipPosition(), normalizeLocation() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (29): main(), periodForFile(), buildAttendanceImportPreview(), buildEmployeeMatcher(), buildValidationFlags(), emptyValidationSummary(), minutesFromTime(), normalizeAttendanceImportIdentity() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (29): createFormFieldAction(), createFormSectionAction(), FormStudioPage(), buildRequestNumber(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), ensureApprovalBlueprintSeedData() (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (25): buildAttendanceNote(), buildLocationNote(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee(), getMobileAttendanceShiftOptions() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (22): MobileExecutivePage(), MobileGamificationPage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive(), getMobileGamification() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (26): uploadFile(), formatDurationLabel(), getDailyActivitySessionDocumentData(), buildS3PublicUrl(), decodeObjectKey(), encodeObjectKey(), ensureLeadingProtocol(), getObjectExtension() (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (18): createMasterGoods(), createMasterLocation(), createMasterRecipient(), createMasterSite(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), deleteMasterSite() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (26): ApprovalPage(), MobileApprovalPage(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow(), fetchApprovalRows() (+18 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (19): errorResponse(), POST(), savePhoto(), cosineSimilarity(), validateEmbedding(), extractServerFaceEmbedding(), getFaceApi(), warmupServerFaceApi() (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (14): getActivityLibraryImportValue(), normalizeHeader(), parseActivityLibraryBoolean(), parseActivityLibraryCsv(), parseActivityLibraryInteger(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue() (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (11): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleFaceVerificationFailure(), handleSubmit(), reopenCameraForRetry() (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (14): asText(), disablePush(), enablePush(), formatDate(), formatNotificationBody(), formatNotificationTitle(), getNotificationDisplayKey(), getPushServiceWorkerRegistration() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (12): buildExcelHtml(), compareCellValues(), downloadText(), exportRowsToFile(), matchesDataFilter(), normalizeFileName(), normalizeFilterValue(), parseNamedMonthDate() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (8): POST(), detectSiteTransfer(), determineDailyStatus(), formatOTHours(), mergeOTAndSPLRecords(), addSummaryTable(), createSiteSheet(), generateSummaryExcel()

### Community 23 - "Community 23"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (6): buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), matrixToEditable(), toDateTimeLocalValue()

### Community 26 - "Community 26"
Cohesion: 0.27
Nodes (8): buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore(), normalizeValue(), pickAssignment(), resolveApprovalRouteForActivity(), resolveLegacyFallbackRoute(), resolveNodeStep()

### Community 27 - "Community 27"
Cohesion: 0.36
Nodes (8): calcOvertimeHours(), centerX(), drawCell(), embedLogo(), formatMoney(), formatPeriodLabel(), generateOvertimeRecordPdf(), generateSiteAllowancePdf()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (8): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData()

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 32 - "Community 32"
Cohesion: 0.38
Nodes (9): capturePage(), getDynamicRoutes(), getOriginalPasswordHash(), login(), main(), restorePassword(), routeToFileName(), setTemporaryPassword() (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.28
Nodes (3): extractRows(), getWipRepairRows(), isRecord()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 37 - "Community 37"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 41 - "Community 41"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 42 - "Community 42"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 43 - "Community 43"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 45 - "Community 45"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 53 - "Community 53"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 55 - "Community 55"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 57 - "Community 57"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 58 - "Community 58"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 59 - "Community 59"
Cohesion: 0.4
Nodes (1): GET()

### Community 62 - "Community 62"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 63 - "Community 63"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 67 - "Community 67"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 68 - "Community 68"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 72 - "Community 72"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 87 - "Community 87"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 88 - "Community 88"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 90 - "Community 90"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (2): calculateEAR(), euclideanDistance()

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 38`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (3 nodes): `face-camera.tsx`, `calculateEAR()`, `euclideanDistance()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (3 nodes): `downloadFile()`, `main()`, `download-face-models.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 0` to `Community 32`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 11`, `Community 43`, `Community 13`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 23`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 10`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 4`, `Community 14`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._