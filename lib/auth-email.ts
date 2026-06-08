import { emailDeliveryLogs } from "@/db/schema/hero";
import { db } from "@/db";
import { getPublicAppUrl } from "@/lib/auth-config";

type AuthEmailPayload = {
    to: string;
    subject: string;
    html: string;
    text: string;
    templateName: string;
    templateCode: string;
};

function getBaseUrl() {
    return getPublicAppUrl();
}

function getFromEmail() {
    return process.env.AUTH_FROM_EMAIL || "noreply@hero.chitraparatama.com";
}

async function sendViaResend(payload: AuthEmailPayload) {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
        return {
            delivered: false,
            reason: "RESEND_API_KEY is not configured",
        };
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: getFromEmail(),
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Resend request failed: ${response.status} ${errorText}`);
    }

    return {
        delivered: true,
        reason: null,
    };
}

async function logAuthEmail(payload: AuthEmailPayload, status: "sent" | "pending" | "failed", errorMessage?: string) {
    await db.insert(emailDeliveryLogs).values({
        deliveryChannel: "email",
        toEmail: payload.to,
        fromEmail: getFromEmail(),
        templateName: payload.templateName,
        templateCode: payload.templateCode,
        subject: payload.subject,
        status,
        errorMessage,
        htmlContent: payload.html,
        textContent: payload.text,
        sentAt: status === "sent" ? new Date() : null,
    });
}

export async function sendAuthEmail(payload: AuthEmailPayload) {
    try {
        const result = await sendViaResend(payload);

        if (result.delivered) {
            await logAuthEmail(payload, "sent");
            return;
        }

        await logAuthEmail(payload, "pending", result.reason ?? undefined);
        console.info(`[auth-email] ${payload.templateCode} prepared for ${payload.to}. Configure RESEND_API_KEY to deliver it.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email error";
        await logAuthEmail(payload, "failed", message);
        throw error;
    }
}

export function buildMagicLinkEmail(email: string, url: string) {
    const appUrl = getBaseUrl();

    return {
        to: email,
        subject: "Magic link untuk masuk ke HERO",
        templateName: "HERO Magic Link",
        templateCode: "hero_auth_magic_link",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
                <h2 style="margin-bottom: 12px;">Masuk ke HERO</h2>
                <p>Gunakan tombol di bawah ini untuk masuk ke workspace HERO Anda.</p>
                <p style="margin: 24px 0;">
                    <a href="${url}" style="display: inline-block; border-radius: 12px; background: #67e8f9; color: #082f49; padding: 12px 18px; font-weight: 700; text-decoration: none;">
                        Masuk dengan Magic Link
                    </a>
                </p>
                <p>Jika tombol tidak bekerja, buka tautan ini:</p>
                <p><a href="${url}">${url}</a></p>
                <p style="font-size: 12px; color: #64748b;">Email ini dikirim dari ${appUrl}.</p>
            </div>
        `,
        text: `Masuk ke HERO dengan magic link ini: ${url}`,
    };
}

export function buildResetPasswordEmail(email: string, url: string) {
    const appUrl = getBaseUrl();

    return {
        to: email,
        subject: "Reset password HERO",
        templateName: "HERO Reset Password",
        templateCode: "hero_auth_reset_password",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
                <h2 style="margin-bottom: 12px;">Reset password HERO</h2>
                <p>Kami menerima permintaan untuk mengubah password akun HERO Anda.</p>
                <p style="margin: 24px 0;">
                    <a href="${url}" style="display: inline-block; border-radius: 12px; background: #67e8f9; color: #082f49; padding: 12px 18px; font-weight: 700; text-decoration: none;">
                        Buat Password Baru
                    </a>
                </p>
                <p>Jika tombol tidak bekerja, buka tautan ini:</p>
                <p><a href="${url}">${url}</a></p>
                <p style="font-size: 12px; color: #64748b;">Email ini dikirim dari ${appUrl}.</p>
            </div>
        `,
        text: `Reset password HERO melalui tautan ini: ${url}`,
    };
}
