import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";

const resendApiKey = defineSecret("RESEND_API_KEY");

setGlobalOptions({ region: "us-central1" });

export const sendTransactionalEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const body = request.data as { to?: string; subject?: string; html?: string };
    const to = typeof body.to === "string" ? body.to : "";
    const subject = typeof body.subject === "string" ? body.subject : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!to || !subject || !html) {
      throw new HttpsError("invalid-argument", "to, subject, and html are required");
    }
    const resend = new Resend(resendApiKey.value());
    const { error } = await resend.emails.send({
      from: "andrew@asleight.com",
      to,
      subject,
      html,
    });
    if (error) {
      throw new HttpsError("internal", error.message);
    }
    return { ok: true };
  },
);
