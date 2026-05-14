# Graph Report - HERO  (2026-05-14)

## Corpus Check
- 441 files · ~731,571 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1838 nodes · 2544 edges · 64 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 439 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]

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
- `importTrainingRecordsAction()` --calls--> `autoMapTrainingRecordHeaders()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\training-record-import.ts
- `importTrainingRecordsAction()` --calls--> `getTrainingRecordImportValue()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\training-record-import.ts
- `manageApprovalMatrixAction()` --calls--> `handleSave()`  [INFERRED]
  app\dashboard\master-data\actions.ts → components\approval-matrix-manager.tsx
- `String()` --calls--> `handleSubmit()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\cargo-manifest-panels.tsx
- `String()` --calls--> `employeeSnLabel()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\scheduling-timesheet-workspace.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (134): addApprovalCommentAction(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen(), bulkProvisionAuthAccountsAction(), bulkUserActionsAction(), cancelDraftSubmissionAction() (+126 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (83): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), handleSimulate(), runSimulation(), handleDelete(), handleSubmit(), updateNavbarThemeAction() (+75 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (79): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+71 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (52): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData() (+44 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (37): notifyEmployeeForPointUpdate(), testPwaPushSettingsAction(), getMobileNotifications(), getMobileNotificationSettings(), buildNotificationScope(), buildRecipientFilter(), clearNotifications(), getRecipientNotifications() (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (20): buildSchedule(), dateRangeDays(), dayFromDate(), defaultPositionOnSite(), employeeSnLabel(), isEmploymentPositionLabel(), isLeadershipPosition(), normalizeLocation() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (28): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (29): main(), periodForFile(), buildAttendanceImportPreview(), buildEmployeeMatcher(), buildValidationFlags(), emptyValidationSummary(), minutesFromTime(), normalizeAttendanceImportIdentity() (+21 more)

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
Cohesion: 0.12
Nodes (27): ApprovalPage(), MobileApprovalPage(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow(), fetchApprovalRows() (+19 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (13): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), autoMapTrainingRecordHeaders(), getTrainingRecordImportValue() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (13): errorResponse(), POST(), savePhoto(), cosineSimilarity(), validateEmbedding(), extractServerFaceEmbedding(), getFaceApi(), errorResponse() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (10): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleFaceVerificationFailure(), handleSubmit(), resolveLocationName() (+2 more)

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
Cohesion: 0.29
Nodes (5): fetchIndonesiaRegionOptions(), loadDistricts(), loadProvinces(), loadRegencies(), loadVillages()

### Community 30 - "Community 30"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (3): extractRows(), getWipRepairRows(), isRecord()

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 35 - "Community 35"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 39 - "Community 39"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 40 - "Community 40"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 41 - "Community 41"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 43 - "Community 43"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 51 - "Community 51"
Cohesion: 0.47
Nodes (4): handleDelete(), handleSubmit(), manageBadgeAction(), manageLevelAction()

### Community 52 - "Community 52"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 54 - "Community 54"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 56 - "Community 56"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 58 - "Community 58"
Cohesion: 0.4
Nodes (1): GET()

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 62 - "Community 62"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 66 - "Community 66"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 67 - "Community 67"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 70 - "Community 70"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 71 - "Community 71"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 74 - "Community 74"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 86 - "Community 86"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 87 - "Community 87"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 89 - "Community 89"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (2): calculateEAR(), euclideanDistance()

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 36`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (3 nodes): `face-camera.tsx`, `calculateEAR()`, `euclideanDistance()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (3 nodes): `downloadFile()`, `main()`, `download-face-models.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 3` to `Community 0`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 41`, `Community 11`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 13`, `Community 6`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 10`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._