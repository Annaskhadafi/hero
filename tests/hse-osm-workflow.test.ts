import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import {
  createHseOsmFinding,
  createHseOsmSession,
  deleteHseOsmSession,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  submitHseOsmAction,
  verifyHseOsmFinding,
} from "../app/actions/hse-osm";
import { resolveUploadUrl } from "../lib/resolve-upload-url";
import { resolveClientUploadUrl } from "../lib/client-upload-url";
import { heroHseOsmSessions, heroHseOsmFindings } from "../db/schema/hse-osm";
import { eq } from "drizzle-orm";

test("HSE OSM Workflow: Session & Finding Lifecycle Integration", async (t) => {
  let createdSessionId: number | null = null;

  await t.test("1. Dashboard metrics and master categories are accessible", async () => {
    const dashboard = await getHseOsmDashboardData();
    assert.equal(dashboard.success, true);
    assert.ok(dashboard.metrics, "Metrics object should exist");
    assert.ok(Array.isArray(dashboard.focusItems), "Focus items should be an array");
    assert.ok(dashboard.focusItems.length >= 5, "Should have at least 5 focus items seeded");
    assert.ok(Array.isArray(dashboard.classifications), "Classifications should be an array");
    assert.ok(dashboard.classifications.length >= 10, "Should have at least 10 classifications seeded");
  });

  await t.test("2. Create OSM Session with team members and initial finding", async () => {
    const res = await createHseOsmSession({
      inspectionDate: "2026-10-10",
      inspectionTime: "10:30",
      locationArea: "Test Area Pit West 3",
      locationDetail: "Bay 2 Workshop Heavy Equipment",
      latitude: "-1.1289565",
      longitude: "116.8537064",
      gpsAccuracy: "±5m",
      focusItemName: "Fatality Prevention",
      leadEmployeeName: "Muhammad Ikbal Test",
      leadBadgeNumber: "2108847",
      leadDepartment: "Mining Operations",
      leadCompany: "PT Chitra Paratama",
      notes: "Test session created via automated test",
      teamMembers: [
        {
          name: "Muhammad Ikbal Test",
          badgeNumber: "2108847",
          department: "Mining Operations",
          company: "PT Chitra Paratama",
          isTeamLeader: true,
          isExternal: false,
        },
        {
          name: "Budi Santoso Eksternal",
          badgeNumber: "KPC-9912",
          department: "Pit Operations",
          company: "PT Kaltim Prima Coal",
          isTeamLeader: false,
          isExternal: true,
        },
      ],
      findings: [
        {
          classificationName: "Vehicle & Mobile Equipment Pneumatic & Hand Tools",
          description: "Selang kompresor mengalami retak klem tanpa whip check",
          photoUrls: ["/api/uploads/hse-osm/sample-finding-1.jpg"],
          riskLevel: "HIGH",
          actionRequired: "Pasang whip check dan ganti klem fitting",
        },
      ],
    });

    assert.equal(res.success, true);
    assert.ok(res.data?.id, "Session ID should be created");
    assert.ok(res.data?.sessionNumber.startsWith("OSM-SES-"), "Session number should match format");
    createdSessionId = res.data!.id;
  });

  await t.test("3. Fetch session details and verify structure", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    assert.equal(detailRes.success, true);
    assert.equal(detailRes.data?.locationArea, "Test Area Pit West 3");
    assert.equal(detailRes.data?.locationDetail, "Bay 2 Workshop Heavy Equipment");
    assert.equal(detailRes.data?.teamMembers?.length, 2);
    assert.equal(detailRes.data?.findings?.length, 1);

    const finding = detailRes.data?.findings[0];
    assert.equal(finding?.status, "OPEN");
    assert.equal(finding?.riskLevel, "HIGH");
    assert.ok(finding?.findingNumber.startsWith("OSM-TKT-"), "Finding number should match format");
  });

  await t.test("4. Add second finding to session", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const fRes = await createHseOsmFinding(createdSessionId, {
      classificationName: "PPE / APD",
      description: "Pekerja tidak memakai helm keselamatan standar di area workshop",
      photoUrls: ["/api/uploads/hse-osm/sample-finding-2.jpg"],
      riskLevel: "MEDIUM",
      actionRequired: "Berikan safety briefing dan lengkapi helm",
    });

    assert.equal(fRes.success, true);
    assert.ok(fRes.data?.id, "New finding ID should exist");
  });

  await t.test("5. Submit corrective action: status changes from OPEN to PROCESSED", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    const finding = detailRes.data?.findings[0];
    assert.ok(finding, "Finding must exist");

    const actionRes = await submitHseOsmAction(finding.id, {
      actionTaken: "Klem fitting telah diganti dengan tipe high pressure dan dipasang whip check safety",
      actionPhotoUrls: ["/api/uploads/hse-osm/sample-proof-1.jpg"],
    });

    assert.equal(actionRes.success, true);
    assert.equal(actionRes.data?.status, "PROCESSED");
    assert.ok(actionRes.data?.actionSubmittedAt, "Submission timestamp should exist");
  });

  await t.test("6. Verify finding closure: status changes to CLOSED", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    const finding = detailRes.data?.findings[0];
    assert.ok(finding, "Finding must exist");

    const verifyRes = await verifyHseOsmFinding(finding.id, {
      status: "CLOSED",
    });

    assert.equal(verifyRes.success, true);
    assert.equal(verifyRes.data?.status, "CLOSED");
    assert.ok(verifyRes.data?.verifiedAt, "Verified timestamp should exist");
  });

  await t.test("7. URL Proxy Resolution for hse-osm", async () => {
    const rawS3Key = "https://is3.cloudhost.id/onechitra/hse-osm/test-photo.jpg?X-Amz-Signature=123";
    const resolvedUrl = resolveUploadUrl(rawS3Key);
    assert.equal(resolvedUrl, "/api/uploads/hse-osm/test-photo.jpg");

    const clientUrl = resolveClientUploadUrl(rawS3Key);
    assert.equal(clientUrl, "/api/uploads/hse-osm/test-photo.jpg");
  });

  await t.test("8. Clean up test records", async () => {
    if (createdSessionId) {
      await deleteHseOsmSession(createdSessionId);
      // Verify soft deletion
      const checkRes = await getHseOsmSessionById(createdSessionId);
      assert.equal(checkRes.success, false, "Soft deleted session should not be found");
    }
  });
});
