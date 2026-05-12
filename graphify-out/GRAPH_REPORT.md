# Graph Report - HERO  (2026-05-12)

## Corpus Check
- 411 files · ~607,904 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1733 nodes · 2416 edges · 60 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 420 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]

## God Nodes (most connected - your core abstractions)
1. `ensureHeroGovernanceSeedData()` - 50 edges
2. `ensureHeroSeedData()` - 45 edges
3. `String()` - 41 edges
4. `ensureDailyActivitySeedData()` - 25 edges
5. `ensureSchedulingTimesheetTables()` - 21 edges
6. `requireSchedulingTimesheetAccess()` - 19 edges
7. `revalidateAdminSurfaces()` - 18 edges
8. `manageSecurityUserAction()` - 18 edges
9. `revalidateDailyActivitySurfaces()` - 17 edges
10. `submitDailyActivityAction()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `saveActivityDraftAction()` --calls--> `saveActivityDraftSubmission()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\approval-blueprint.ts
- `addApprovalCommentAction()` --calls--> `appendApprovalNoteEntry()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\approval-notes.ts
- `importTrainingRecordsAction()` --calls--> `autoMapTrainingRecordHeaders()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\training-record-import.ts
- `importTrainingRecordsAction()` --calls--> `getTrainingRecordImportValue()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\training-record-import.ts
- `manageApprovalMatrixAction()` --calls--> `handleSave()`  [INFERRED]
  app\dashboard\master-data\actions.ts → components\approval-matrix-manager.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (84): AnalyticsPage(), SchedulingTimesheetAttendancePage(), AuditLogsPage(), runSimulation(), fetchIndonesiaRegionOptions(), handleDelete(), handleSubmit(), loadDistricts() (+76 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (92): addApprovalCommentAction(), applyApprovalDecision(), applyAttendanceImportPreviewAction(), approveApprovalGroupAction(), assertSchedulingPeriodOpen(), bulkUserActionsAction(), cancelDraftSubmissionAction(), clearAttendanceRealOverridesAction() (+84 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (49): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData() (+41 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (56): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+48 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (38): notifyEmployeeForPointUpdate(), getMobileNotificationCount(), getMobileNotifications(), getMobileNotificationSettings(), buildNotificationScope(), buildRecipientFilter(), clearNotifications(), getRecipientNotifications() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (31): MobileExecutivePage(), MobileGamificationPage(), GET(), MobileHsePage(), formatDurationLabel(), getDailyActivitySessionDocumentData(), endOfMonth(), getMobileEmployeeContext() (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (35): dateTimeLocalValue(), MobileActivityInputPage(), endOfDay(), getActiveOvertimeCommandLetterForEmployee(), getCurrentEmployeeByEmail(), getDailyActivityConfigurationData(), getDailyActivityEmployeeData(), getDailyActivityLibraryData() (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (30): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (33): FormStudioPage(), buildRequestNumber(), cancelFormSubmissionDraft(), cloneFormTemplateVersion(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), createWorkflowCondition() (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (20): buildSchedule(), dateRangeDays(), dayFromDate(), defaultPositionOnSite(), employeeSnLabel(), isEmploymentPositionLabel(), isLeadershipPosition(), normalizeLocation() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (28): ApprovalPage(), MobileApprovalPage(), appendApprovalNoteEntry(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow() (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (24): buildAttendanceNote(), buildLocationNote(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee(), getMobileAttendanceShiftOptions() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (18): createMasterGoods(), createMasterLocation(), createMasterRecipient(), createMasterSite(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), deleteMasterSite() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.1
Nodes (25): main(), periodForFile(), buildAttendanceImportPreview(), buildEmployeeMatcher(), buildValidationFlags(), emptyValidationSummary(), minutesFromTime(), normalizeAttendanceImportIdentity() (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (13): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), autoMapTrainingRecordHeaders(), getTrainingRecordImportValue() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (17): handleSubmit(), handleToggleActive(), buildTransportSettings(), getExistingPwaPushSettings(), getExistingSmtpSettings(), saveEmailSmtpSettingsAction(), saveEmailTemplateAction(), savePwaPushSettingsAction() (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (7): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleSubmit(), resolveLocationName()

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (14): asText(), disablePush(), enablePush(), formatDate(), formatNotificationBody(), formatNotificationTitle(), getNotificationDisplayKey(), getPushServiceWorkerRegistration() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (7): buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), handleSimulate(), matrixToEditable(), toDateTimeLocalValue()

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (8): buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore(), normalizeValue(), pickAssignment(), resolveApprovalRouteForActivity(), resolveLegacyFallbackRoute(), resolveNodeStep()

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 32 - "Community 32"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 37 - "Community 37"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 38 - "Community 38"
Cohesion: 0.36
Nodes (5): addIssue(), getSiteAssignmentRows(), normalize(), runMasterDataSyncAudit(), main()

### Community 40 - "Community 40"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 47 - "Community 47"
Cohesion: 0.47
Nodes (4): handleDelete(), handleSubmit(), manageBadgeAction(), manageLevelAction()

### Community 48 - "Community 48"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 50 - "Community 50"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 52 - "Community 52"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 53 - "Community 53"
Cohesion: 0.4
Nodes (2): attendanceHours(), minutesFromTime()

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (1): GET()

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 62 - "Community 62"
Cohesion: 0.7
Nodes (4): buildUtcDate(), getBirthDateInputValue(), normalizeBirthDateValue(), parseBirthDateValue()

### Community 63 - "Community 63"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 64 - "Community 64"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 68 - "Community 68"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 83 - "Community 83"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 84 - "Community 84"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 86 - "Community 86"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 33`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (6 nodes): `attendance-real.ts`, `attendanceHours()`, `attendanceStatusLabel()`, `calculateAttendanceOvertime()`, `minutesFromTime()`, `normalizeAttendanceStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 2` to `Community 1`, `Community 38`, `Community 7`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 18`, `Community 19`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 3` to `Community 2`, `Community 4`, `Community 7`, `Community 9`, `Community 17`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 0` to `Community 16`, `Community 1`, `Community 14`, `Community 7`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._