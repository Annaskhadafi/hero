import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import {
  createHseOsmFinding,
  createHseOsmSession,
  deleteHseOsmFinding,
  deleteHseOsmSession,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  submitHseOsmAction,
  submitHseOsmSession,
  updateHseOsmFindingPhotos,
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

  await t.test("8. Add Standard / Close finding: auto status CLOSED and auto verified", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const stdRes = await createHseOsmFinding(createdSessionId, {
      classificationName: "Vehicle & Mobile Equipment Pneumatic & Hand Tools",
      description: "Penempatan Tools telah sesuai / Good Condition",
      condition: "STANDARD",
      riskLevel: "LOW",
    });

    assert.equal(stdRes.success, true);
    assert.equal(stdRes.data?.status, "CLOSED", "Standard finding must have CLOSED status directly");
    assert.ok(stdRes.data?.verifiedAt, "Standard finding must be verified automatically");
    assert.ok(stdRes.data?.actionTaken?.includes("Standard / Close"), "Action taken must reflect standard condition");
  });

  await t.test("9. Submit OSM Session to lock it (SUBMITTED)", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const submitRes = await submitHseOsmSession(createdSessionId);
    assert.equal(submitRes.success, true);
    assert.equal(submitRes.data?.status, "SUBMITTED");
  });

  await t.test("10. Submit corrective action on SUBMITTED session succeeds", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    // Finding 2 is OPEN
    const openFinding = detailRes.data?.findings.find((f: any) => f.status === "OPEN");
    assert.ok(openFinding, "Open finding must exist");

    const actionRes = await submitHseOsmAction(openFinding.id, {
      actionTaken: "Telah dilakukan tindakan perbaikan dengan memasang APD lengkap di lapangan",
      actionPhotoUrls: ["/api/uploads/hse-osm/action-proof.jpg"],
    });

    assert.equal(actionRes.success, true, "Corrective action on SUBMITTED session must succeed");
    assert.equal(actionRes.data?.status, "PROCESSED");
  });

  await t.test("11. Re-submit corrective action on REJECTED finding succeeds", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    const processedFinding = detailRes.data?.findings.find((f: any) => f.status === "PROCESSED");
    assert.ok(processedFinding, "Processed finding must exist");

    // Reject it first
    const rejectRes = await verifyHseOsmFinding(processedFinding.id, {
      status: "REJECTED",
      rejectionReason: "Foto perbaikan kurang jelas, tolong foto ulang dari jarak dekat",
    });
    assert.equal(rejectRes.success, true);
    assert.equal(rejectRes.data?.status, "REJECTED");

    // Resubmit action
    const resubmitRes = await submitHseOsmAction(processedFinding.id, {
      actionTaken: "Foto telah diperbarui dengan jarak dekat sesuai standar",
      actionPhotoUrls: ["/api/uploads/hse-osm/action-proof-revised.jpg"],
    });
    assert.equal(resubmitRes.success, true, "Re-submitting action on REJECTED finding must succeed");
    assert.equal(resubmitRes.data?.status, "PROCESSED");
    assert.equal(resubmitRes.data?.rejectionReason, "");
  });

  await t.test("12. Updating finding original photos on SUBMITTED session is blocked", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    const finding = detailRes.data?.findings[0];
    assert.ok(finding, "Finding must exist");

    const updatePhotosRes = await updateHseOsmFindingPhotos(finding.id, ["/api/uploads/hse-osm/tampered.jpg"]);
    assert.equal(updatePhotosRes.success, false);
    assert.equal(
      updatePhotosRes.error,
      "Laporan OSM telah disubmit dan terkunci. Foto temuan tidak dapat diubah lagi."
    );
  });

  await t.test("13. Deleting finding on SUBMITTED session is blocked", async () => {
    assert.ok(createdSessionId, "Created session ID must exist");
    const detailRes = await getHseOsmSessionById(createdSessionId);
    const finding = detailRes.data?.findings[0];
    assert.ok(finding, "Finding must exist");

    const deleteRes = await deleteHseOsmFinding(finding.id);
    assert.equal(deleteRes.success, false);
    assert.equal(
      deleteRes.error,
      "Laporan OSM telah disubmit dan terkunci. Temuan tidak dapat dihapus."
    );
  });

  await t.test("14. Clean up test records", async () => {
    if (createdSessionId) {
      // Direct db cleanup since deleteHseOsmSession is blocked on SUBMITTED
      await db.delete(heroHseOsmFindings).where(eq(heroHseOsmFindings.sessionId, createdSessionId));
      await db.delete(heroHseOsmSessions).where(eq(heroHseOsmSessions.id, createdSessionId));
    }
  });
});
