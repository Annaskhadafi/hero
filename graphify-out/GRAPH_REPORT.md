# Graph Report - HERO  (2026-05-06)

## Corpus Check
- 389 files · ~575,814 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1571 nodes · 2103 edges · 54 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 349 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]

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
- `SecurityUsersPage()` --calls--> `getSecurityUsersData()`  [INFERRED]
  app\dashboard\security\users\page.tsx → lib\hero-admin.ts
- `String()` --calls--> `handleSubmit()`  [INFERRED]
  app\dashboard\timesheet\timesheet\page.tsx → components\cargo-manifest-panels.tsx
- `getFormStudioOverviewData()` --calls--> `ensureHeroSeedData()`  [INFERRED]
  lib\approval-workspace.ts → lib\hero-admin.ts
- `getWorkflowStudioOverviewData()` --calls--> `ensureHeroSeedData()`  [INFERRED]
  lib\approval-workspace.ts → lib\hero-admin.ts
- `ensureHeroGovernanceSeedData()` --calls--> `getPortalChitraAppById()`  [INFERRED]
  lib\hero-admin.ts → lib\portal-chitra.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (120): AnalyticsPage(), addApprovalCommentAction(), applyApprovalDecision(), approveApprovalGroupAction(), bulkUserActionsAction(), cancelDraftSubmissionAction(), cloneFormTemplateVersionAction(), createActivityAction() (+112 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (61): AuditLogsPage(), buildEmptyMatrix(), handleDelete(), handleNewMatrix(), handleSave(), handleSimulate(), matrixToEditable(), toDateTimeLocalValue() (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (55): assertOvertimeRequestCreationAccess(), buildDailySessionCode(), buildSplNumber(), canManageOvertimeRequestSettings(), endOfDay(), getAuthenticatedEmployeeContext(), getImportCsvText(), getOvertimeRequestLeaderPermission() (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): ensureCargoManifestTables(), generateManifestNumber(), getCargoManifestById(), getCargoManifests(), importCargoManifestsAction(), manageCargoManifestAction(), parseItemsJson(), syncCargoMasterData() (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (36): createNotificationDelivery(), dataUrlToFile(), getAuthenticatedEmployee(), normalizeCoordinate(), normalizeSyncText(), resolveEmergencyRecipients(), sendEmergencyAlerts(), submitEmergencyIncidentFromPayload() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (35): dateTimeLocalValue(), MobileActivityInputPage(), endOfDay(), getActiveOvertimeCommandLetterForEmployee(), getCurrentEmployeeByEmail(), getDailyActivityConfigurationData(), getDailyActivityEmployeeData(), getDailyActivityLibraryData() (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (36): testPwaPushSettingsAction(), getMobileNotifications(), getMobileNotificationSettings(), buildNotificationScope(), buildRecipientFilter(), clearNotifications(), getRecipientNotifications(), getRecipientUnreadNotificationCount() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (22): MobileExecutivePage(), MobileGamificationPage(), GET(), MobileHsePage(), endOfMonth(), getMobileEmployeeContext(), getMobileExecutive(), getMobileGamification() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (24): buildAttendanceNote(), buildLocationNote(), ensureEmployeeSite(), formatOvertimeLabel(), getAttendancePageData(), getAttendanceQueryWindow(), getCurrentEmployee(), getMobileAttendanceShiftOptions() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (28): ApprovalPage(), MobileApprovalPage(), parseApprovalNoteEntries(), buildApprovalComments(), buildApprovalTimeline(), buildWorkflowPreview(), enrichApprovalRow(), fetchApprovalRows() (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (13): createMasterGoods(), createMasterLocation(), createMasterRecipient(), deleteMasterGoods(), deleteMasterLocation(), deleteMasterRecipient(), updateMasterGoods(), updateMasterLocation() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (20): getCurrentEmployeeAccessRole(), getCurrentMenuPermission(), getEmployeeAccessRoleByEmail(), getMenuPermissionForRole(), filterPortalAppsForRole(), getPortalChitraAppById(), getPortalChitraBaseData(), getPortalChitraSettingsData() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (17): getDatabaseUrl(), getDatabaseUrlErrorMessage(), bootstrapConflictingMigration(), columnExists(), ensureMigrationsTable(), entryAlreadyMaterialized(), getAppliedMigrationTimes(), getExistingColumnConflict() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (7): captureFrame(), fileToPayload(), getEventLabel(), getReverseGeocodeLabel(), handleCaptureClick(), handleSubmit(), resolveLocationName()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (14): asText(), disablePush(), enablePush(), formatDate(), formatNotificationBody(), formatNotificationTitle(), getNotificationDisplayKey(), getPushServiceWorkerRegistration() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (15): uploadFile(), buildS3PublicUrl(), decodeObjectKey(), encodeObjectKey(), ensureLeadingProtocol(), getObjectExtension(), getObjectKeyFromUrl(), getS3Client() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (10): parseActivityLibraryCsv(), importUsersWithDetailedErrors(), detectCsvDelimiter(), getMappedValue(), parseCsv(), parseCsvToRecords(), buildShortCodeRecords(), loadCsv() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): buildDefaultSelfInputEntry(), buildSelfInputPayloads(), clearDraft(), fileToPayload(), getDurationMinutes(), handleSubmit(), sendPayload(), shiftDateTimeLocalValue() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (11): extractAreaLabel(), formatCoordinate(), getCoordinateKey(), getCoordinateLabel(), getLocationLines(), getLogCoordinateLabel(), getOperationalDetails(), handleOpenPhoto() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (11): formatDurationLabel(), getDailyActivitySessionDocumentData(), chunk(), drawDocumentHeader(), drawSignatureArea(), drawWorkTable(), GET(), loadLetterheadImage() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.37
Nodes (13): cancelTask(), completeTask(), fail(), findTaskFile(), findTasksDir(), listTasks(), main(), printHelp() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.27
Nodes (8): buildVacantApproverLabel(), getApprovalContext(), getMatrixSpecificityScore(), normalizeValue(), pickAssignment(), resolveApprovalRouteForActivity(), resolveLegacyFallbackRoute(), resolveNodeStep()

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (6): acceptInvitation(), createEmailVerification(), createUserInvitation(), generateInvitationToken(), generateVerificationToken(), verifyInvitationToken()

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (6): getPostLoginPathForUserAgent(), isMobileUserAgent(), getClientPostLoginPath(), handleGoogleSignIn(), handleMagicLinkSignIn(), handleSubmit()

### Community 29 - "Community 29"
Cohesion: 0.36
Nodes (7): getArbitraryHexBackgroundTone(), hasCustomBackgroundFill(), hasExplicitTextColor(), inferBackgroundResetClassName(), inferContrastTone(), inferInteractiveTextClassName(), inferSurfaceTextClassName()

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (2): firstName(), getGreeting()

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (3): NavDocuments(), NavUser(), useSidebar()

### Community 33 - "Community 33"
Cohesion: 0.36
Nodes (4): clearDraft(), fileToPayload(), submitEmergency(), submitObservation()

### Community 34 - "Community 34"
Cohesion: 0.46
Nodes (7): buildMagicLinkEmail(), buildResetPasswordEmail(), getBaseUrl(), getFromEmail(), logAuthEmail(), sendAuthEmail(), sendViaResend()

### Community 36 - "Community 36"
Cohesion: 0.38
Nodes (4): CategorySelectField(), formatDateInput(), formatDateTimeInput(), getCategoryOptions()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (3): getSecurityUsersDataPaginated(), calculatePagination(), getOffset()

### Community 43 - "Community 43"
Cohesion: 0.47
Nodes (4): handleDelete(), handleSubmit(), manageBadgeAction(), manageLevelAction()

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (2): if(), toDateTimeLocalValue()

### Community 46 - "Community 46"
Cohesion: 0.6
Nodes (5): buildAutoMapping(), handleFileChange(), normalizeImportToken(), normalizeParsedRows(), parseWorkbookRows()

### Community 48 - "Community 48"
Cohesion: 0.6
Nodes (5): getClientAuthBaseUrl(), getConfiguredAuthOrigins(), getServerAuthBaseUrl(), getTrustedOrigins(), normalizeOrigin()

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (1): GET()

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (2): handleNotificationsUpdated(), loadNotificationCount()

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 57 - "Community 57"
Cohesion: 0.7
Nodes (4): clean(), main(), slug(), write_csv()

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): buildEndpoint(), GET(), normalizeOptions()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (2): ActivityTemplateForm(), getDurationLabel()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): createEmptyDraft(), PortalChitraSettingsPanel()

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (2): formatAuditValue(), formatSeverity()

### Community 76 - "Community 76"
Cohesion: 0.83
Nodes (3): getDb(), getPool(), getSslConfig()

### Community 77 - "Community 77"
Cohesion: 0.5
Nodes (2): ChartAreaInteractive(), useIsMobile()

### Community 78 - "Community 78"
Cohesion: 0.83
Nodes (3): haversineDistanceMeters(), toNumber(), validateSiteBoundary()

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (2): getBooleanEnv(), getFirstEnvValue()

### Community 80 - "Community 80"
Cohesion: 0.83
Nodes (3): main(), mapPositionCode(), mapSiteId()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): main(), test()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): handleAuth(), isDatabaseConnectionError()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): formValue(), updateMobileProfileAction()

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): AdminStatusBadge(), normalize()

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (2): clean(), main()

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (2): clean(), main()

## Knowledge Gaps
- **Thin community `Community 30`** (8 nodes): `page.tsx`, `buildRecentFeed()`, `firstName()`, `formatFeedTime()`, `formatShortTime()`, `getGreeting()`, `getNextAction()`, `MiniAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (6 nodes): `collect()`, `DraggableEmployee()`, `formatScopeType()`, `if()`, `toDateTimeLocalValue()`, `org-structure-builder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (5 nodes): `route.ts`, `route.ts`, `DELETE()`, `GET()`, `PATCH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (5 nodes): `mobile-app-shell.tsx`, `beginNavigation()`, `forceLightMode()`, `handleNotificationsUpdated()`, `loadNotificationCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `ActivityTemplateForm()`, `dedupeOptions()`, `getDurationLabel()`, `activity-template-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `createDraftFromApp()`, `createEmptyDraft()`, `PortalChitraSettingsPanel()`, `portal-chitra-settings-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (4 nodes): `formatAuditValue()`, `formatSeverity()`, `SecurityAuditLogTable()`, `security-audit-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (4 nodes): `ChartAreaInteractive()`, `chart-area-interactive.tsx`, `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (4 nodes): `getBooleanEnv()`, `getFirstEnvValue()`, `getRequiredEnv()`, `server-env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `main()`, `test()`, `test-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `handleAuth()`, `isDatabaseConnectionError()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `actions.ts`, `formValue()`, `updateMobileProfileAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `AdminStatusBadge()`, `normalize()`, `admin-status-badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (3 nodes): `clean()`, `main()`, `analyze_data_hero.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (3 nodes): `clean()`, `main()`, `build_data_hero_summary.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Boolean()` connect `Community 2` to `Community 3`, `Community 4`, `Community 6`, `Community 12`, `Community 15`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `ensureHeroGovernanceSeedData()` connect `Community 1` to `Community 0`, `Community 11`, `Community 4`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `String()` connect `Community 3` to `Community 4`, `Community 8`, `Community 10`, `Community 13`, `Community 14`, `Community 18`, `Community 20`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `ensureHeroGovernanceSeedData()` (e.g. with `getAuthenticatedEmployee()` and `importSecurityUsersAction()`) actually correct?**
  _`ensureHeroGovernanceSeedData()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `ensureHeroSeedData()` (e.g. with `createActivityAction()` and `saveActivityDraftAction()`) actually correct?**
  _`ensureHeroSeedData()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `String()` (e.g. with `generateManifestNumber()` and `POST()`) actually correct?**
  _`String()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `ensureDailyActivitySeedData()` (e.g. with `manageActivityLibraryAction()` and `manageActivityRouteTemplateAction()`) actually correct?**
  _`ensureDailyActivitySeedData()` has 17 INFERRED edges - model-reasoned connections that need verification._