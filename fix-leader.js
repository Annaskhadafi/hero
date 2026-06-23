const fs = require('fs');
const path = 'D:\\[01] PROJECT\\HERO\\app\\actions\\leader-performance.ts';
let content = fs.readFileSync(path, 'utf-8');

// 1. Fix imports
content = content.replace(
  'import {\n  sendHumanCapitalEmail,\n  buildHumanCapitalEmail,\n} from "@/lib/human-capital-email";\nimport { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";',
  'import {\n  buildHumanCapitalEmail,\n  getHumanCapitalEmailConfig,\n  parseEmailList,\n} from "@/lib/human-capital-email";\nimport { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";\nimport { sendWorkflowEmailToMany } from "@/lib/workflow-email";'
);

// 2. Fix notification logic - find and replace the block
const oldBlock =     if (!review) return;

    if (review.status === "submitted") {
      // 1. Notify via Bell
      await notifyWorkflowBellRecipients({
        recipientEmails: [review.leaderEmail, review.reviewerEmail],
        eventType: "hc_leader_performance_submitted",
        category: "info",
        title: "Evaluasi Leader Performance Disubmit",
        body: \Evaluasi pimpinan untuk \ (\) telah disubmit dengan skor rata-rata \.\,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email
      const title = \Evaluasi Leader Performance disubmit: \\;
      const intro = \Evaluasi Leader Performance untuk pimpinan \ pada periode \ telah disubmit oleh penilai \ dengan nilai rata-rata \.\;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          \Leader: \\,
          \Penilai: \\,
          \Periode: \\,
          \Skor Rata-rata: \\,
          \Masukan: \\,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: \\/dashboard/hc/leader-performance\,
      });

      await sendHumanCapitalEmail({
        templateCode: "hc_leader_performance_submitted",
        templateName: "HC Leader Performance Submitted",
        fallbackSubject: title,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
        actorEmail: review.reviewerEmail,
        variables: {
          leaderName: review.leaderName || "",
          reviewerName: review.reviewerName || "",
          period: review.period || "",
          overallScore: review.overallScore || "",
        },
        extraTo: review.leaderEmail,
      });
    } else if (review.status === "reviewed") {
      // 1. Notify via Bell
      await notifyWorkflowBellRecipients({
        recipientEmails: [review.leaderEmail, review.reviewerEmail],
        eventType: "hc_leader_performance_reviewed",
        category: "info",
        title: "Evaluasi Leader Performance Ditinjau",
        body: \Evaluasi pimpinan untuk \ (\) telah selesai ditinjau.\,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email
      const title = \Evaluasi Leader Performance selesai ditinjau: \\;
      const intro = \Evaluasi Leader Performance untuk pimpinan \ pada periode \ telah selesai ditinjau oleh HC / Admin.\;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          \Leader: \\,
          \Penilai: \\,
          \Periode: \\,
          \Status: Reviewed\,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: \\/dashboard/hc/leader-performance\,
      });

      await sendHumanCapitalEmail({
        templateCode: "hc_leader_performance_reviewed",
        templateName: "HC Leader Performance Reviewed",
        fallbackSubject: title,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
        actorEmail: review.reviewerEmail,
        variables: {
          leaderName: review.leaderName || "",
          reviewerName: review.reviewerName || "",
          period: review.period || "",
        },
        extraTo: review.leaderEmail,
      });
    };

const newBlock = \    if (!review) return;

    // Get configured HC recipients (HRGA) from Settings > Email — no fallback to all HC
    const hcConfig = await getHumanCapitalEmailConfig();
    const hcTo = hcConfig.isActive ? parseEmailList(hcConfig.recipientEmails) : [];
    const hcCc = hcConfig.isActive ? parseEmailList(hcConfig.ccEmails) : [];

    if (review.status === "submitted") {
      // 1. Notify via Bell — only to configured HC recipients (HRGA)
      await notifyWorkflowBellRecipients({
        recipientEmails: hcTo,
        eventType: "hc_leader_performance_submitted",
        category: "info",
        title: "Evaluasi Leader Performance Disubmit",
        body: \Evaluasi pimpinan untuk \ (\) telah disubmit dengan skor rata-rata \.\,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email — only to configured HC recipients (HRGA)
      const title = \Evaluasi Leader Performance disubmit: \\;
      const intro = \Evaluasi Leader Performance untuk pimpinan \ pada periode \ telah disubmit oleh penilai \ dengan nilai rata-rata \.\;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          \Leader: \\,
          \Penilai: \\,
          \Periode: \\,
          \Skor Rata-rata: \\,
          \Masukan: \\,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: \\/dashboard/hc/leader-performance\,
      });

      if (hcTo.length > 0) {
        await sendWorkflowEmailToMany({
          recipients: hcTo,
          cc: hcCc,
          templateCode: "hc_leader_performance_submitted",
          templateName: "HC Leader Performance Submitted",
          fallbackSubject: title,
          fallbackHtml: emailContent.html,
          fallbackText: emailContent.text,
          actorEmail: review.reviewerEmail,
          variables: {
            leaderName: review.leaderName || "",
            reviewerName: review.reviewerName || "",
            period: review.period || "",
            overallScore: review.overallScore || "",
          },
        });
      }
    } else if (review.status === "reviewed") {
      // 1. Notify via Bell — leader + reviewer (mereka perlu tau hasil review)
      await notifyWorkflowBellRecipients({
        recipientEmails: [review.leaderEmail, review.reviewerEmail],
        eventType: "hc_leader_performance_reviewed",
        category: "info",
        title: "Evaluasi Leader Performance Ditinjau",
        body: \Evaluasi pimpinan untuk \ (\) telah selesai ditinjau.\,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email — only to configured HC recipients (HRGA), NOT leader/reviewer
      const title = \Evaluasi Leader Performance selesai ditinjau: \\;
      const intro = \Evaluasi Leader Performance untuk pimpinan \ pada periode \ telah selesai ditinjau oleh HC / Admin.\;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          \Leader: \\,
          \Penilai: \\,
          \Periode: \\,
          \Status: Reviewed\,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: \\/dashboard/hc/leader-performance\,
      });

      if (hcTo.length > 0) {
        await sendWorkflowEmailToMany({
          recipients: hcTo,
          cc: hcCc,
          templateCode: "hc_leader_performance_reviewed",
          templateName: "HC Leader Performance Reviewed",
          fallbackSubject: title,
          fallbackHtml: emailContent.html,
          fallbackText: emailContent.text,
          actorEmail: review.reviewerEmail,
          variables: {
            leaderName: review.leaderName || "",
            reviewerName: review.reviewerName || "",
            period: review.period || "",
          },
        });
      }
    }\;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('OK — file patched');
} else {
  console.log('ERR — oldBlock not found');
  // Debug: show partial match
  const idx = content.indexOf('if (!review) return');
  if (idx >= 0) {
    console.log('Found start at', idx);
    console.log(content.substring(idx, idx + 500));
  }
}
