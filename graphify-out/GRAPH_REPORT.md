# Graph Report - HERO  (2026-05-06)

## Corpus Check
- 391 files · ~578,036 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1589 nodes · 2124 edges · 55 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 351 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]

## God Nodes (most connected - your core abstractions)
1. `ensureHeroGovernanceSeedData()` - 50 edges
2. `ensureHeroSeedData()` - 45 edges
3. `String()` - 26 edges
4. `ensureDailyActivitySeedData()` - 25 edges
5. `revalidateAdminSurfaces()` - 18 edges
6. `manageSecurityUserAction()` - 17 edges
7. `revalidateDailyActivitySurfaces()` - 17 edges
8. `submitDailyActivityAction()` - 17 edges
9. `ensureNotificationInfrastructure()` - 16 edges
10. `getApprovalCenterData()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `saveActivityDraftAction()` --calls--> `saveActivityDraftSubmission()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\approval-blueprint.ts
- `addApprovalCommentAction()` --calls--> `appendApprovalNoteEntry()`  [INFERRED]
  app\dashboard\admin-actions.ts → lib\approval-notes.ts
- `String()` --calls--> `handleSubmit()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\cargo-manifest-panels.tsx
- `getFormStudioOverviewData()` --calls--> `ensureHeroSeedData()`  [INFERRED]
  lib\approval-workspace.ts → lib\hero-admin.ts
- `getWorkflowStudioOverviewData()` --calls--> `ensureHeroSeedData()`  [INFERRED]
  lib\approval-workspace.ts → lib\hero-admin.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (90): AnalyticsPage(), handleDelete(), handleSubmit(), addApprovalCommentAction(), applyApprovalDecision(), approveApprovalGroupAction(), bulkUserActionsAction(), cancelDraftSubmissionAction() (+82 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (70): AuditLogsPage(), buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), handleSimulate(), matrixToEditable(), toDateTimeLocalValue() (+62 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (55): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData() (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (36): getAttendanceQueryWindow(), dateTimeLocalValue(), MobileActivityInputPage(), endOfDay(), getActiveOvertimeCommandLetterForEmployee(), getCurrentEmployeeByEmail(), getDailyActivityConfigurationData(), getDailyActivityEmployeeData() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (36): testPwaPushSettingsAction(), getMobileNotifications(), getMobileNotificationSettings(), buildNotificationScope(), buildRecipientFilter(), clearNotifications(), getRecipientNotifications(), getRecipientUnreadNotificationCount() (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (33): FormStudioPage(), buildRequestNumber(), cancelFormSubmissionDraft(), cloneFormTemplateVersion(), compareConditionValue(), createFormTemplateField(), createFormTemplateSection(), createWorkflowCondition() (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (28): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (29): ApprovalPage(), MobileApprovalPage(), appendApprovalNoteEntry(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (22): MobileExecutivePage(), MobileGamificationPage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive(), getMobileGamification() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (23): buildAttendanceNote(), buildLocationNote(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getCurrentEmployee(), getMobileAttendanceShiftOptions(), getTodayAttendanceLogs() (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (13): createMasterGoods(), createMasterLocation(), createMasterRecipient(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), updateMasterGoods(), updateMasterLocation() (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (11): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), parseTrainingRecordCsv(), buildShortCodeRecords() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (15): uploadFile(), buildS3PublicUrl(), decodeObjectKey(), encodeObjectKey(), ensureLeadingProtocol(), getObjectExtension(), getObjectKeyFromUrl(), getS3Client() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (7): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleSubmit(), resolveLocationName()

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (14): asText(), disablePush(), enablePush(), formatDate(), formatNotificationBody(), formatNotificationTitle(), getNotificationDisplayKey(), getPushServiceWorkerRegistration() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (11): formatDurationLabel(), getDailyActivitySessionDocumentData(), chunk(), drawDocumentHeader(), drawSignatureArea(), drawWorkTable(), GET(), loadLetterheadImage() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (3): applyEmployeeEdit(), dateRangeDays(), dayFromDate()

### Community 22 - "Community 22"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (8): buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore(), normalizeValue(), pickAssignment(), resolveApprovalRouteForActivity(), resolveLegacyFallbackRoute(), resolveNodeStep()

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 31 - "Community 31"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 35 - "Community 35"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 36 - "Community 36"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 38 - "Community 38"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 47 - "Community 47"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 49 - "Community 49"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 50 - "Community 50"
Cohesion: 0.4
Nodes (1): GET()

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 58 - "Community 58"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 59 - "Community 59"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 63 - "Community 63"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 78 - "Community 78"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 79 - "Community 79"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 80 - "Community 80"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 81 - "Community 81"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 32`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 12`, `Community 7`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 5`, `Community 7`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `String()` connect `Community 3` to `Community 7`, `Community 10`, `Community 11`, `Community 16`, `Community 17`, `Community 19`, `Community 22`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._