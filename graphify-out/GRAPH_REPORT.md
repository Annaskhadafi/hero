# Graph Report - HERO  (2026-05-14)

## Corpus Check
- 441 files · ~731,562 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1838 nodes · 2543 edges · 63 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 438 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]

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
- `manageApprovalMatrixAction()` --calls--> `handleSave()`  [INFERRED]
  app\dashboard\master-data\actions.ts → components\approval-matrix-manager.tsx
- `String()` --calls--> `handleSubmit()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\cargo-manifest-panels.tsx
- `String()` --calls--> `employeeSnLabel()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\scheduling-timesheet-workspace.tsx
- `String()` --calls--> `normalizeTime()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → lib\timesheet\attendance-import.ts
- `String()` --calls--> `normalizeTimeValue()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → lib\timesheet\attendance-template-parser.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (118): addApprovalCommentAction(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen(), bulkProvisionAuthAccountsAction(), bulkUserActionsAction(), cancelDraftSubmissionAction() (+110 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (88): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), handleSimulate(), runSimulation(), fetchIndonesiaRegionOptions(), handleDelete(), handleSubmit() (+80 more)

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
Nodes (29): createFormFieldAction(), createFormSectionAction(), FormStudioPage(), buildRequestNumber(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), ensureApprovalBlueprintSeedData() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (25): buildAttendanceNote(), buildLocationNote(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee(), getMobileAttendanceShiftOptions() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (22): MobileExecutivePage(), MobileGamificationPage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive(), getMobileGamification() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (26): uploadFile(), formatDurationLabel(), getDailyActivitySessionDocumentData(), buildS3PublicUrl(), decodeObjectKey(), encodeObjectKey(), ensureLeadingProtocol(), getObjectExtension() (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (18): createMasterGoods(), createMasterLocation(), createMasterRecipient(), createMasterSite(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), deleteMasterSite() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (27): ApprovalPage(), MobileApprovalPage(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow(), fetchApprovalRows() (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (13): errorResponse(), POST(), savePhoto(), cosineSimilarity(), validateEmbedding(), extractServerFaceEmbedding(), getFaceApi(), errorResponse() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (9): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleFaceVerificationFailure(), handleSubmit(), resolveLocationName() (+1 more)

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

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (8): buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore(), normalizeValue(), pickAssignment(), resolveApprovalRouteForActivity(), resolveLegacyFallbackRoute(), resolveNodeStep()

### Community 26 - "Community 26"
Cohesion: 0.27
Nodes (6): buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), matrixToEditable(), toDateTimeLocalValue()

### Community 29 - "Community 29"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (3): extractRows(), getWipRepairRows(), isRecord()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 38 - "Community 38"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 39 - "Community 39"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 40 - "Community 40"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 42 - "Community 42"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 50 - "Community 50"
Cohesion: 0.47
Nodes (4): handleDelete(), handleSubmit(), manageBadgeAction(), manageLevelAction()

### Community 51 - "Community 51"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 53 - "Community 53"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 55 - "Community 55"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (1): GET()

### Community 60 - "Community 60"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 65 - "Community 65"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 66 - "Community 66"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 69 - "Community 69"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 70 - "Community 70"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 85 - "Community 85"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 86 - "Community 86"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 87 - "Community 87"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 88 - "Community 88"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (2): calculateEAR(), euclideanDistance()

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 35`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (3 nodes): `face-camera.tsx`, `calculateEAR()`, `euclideanDistance()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (3 nodes): `downloadFile()`, `main()`, `download-face-models.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 3` to `Community 0`, `Community 5`, `Community 6`, `Community 7`, `Community 40`, `Community 9`, `Community 12`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 6`, `Community 14`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 11`, `Community 17`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._