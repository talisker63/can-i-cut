# Help

This app summarises **private land** tree rules in **Victoria** from your address and tree type. Output is **indicative only** — always confirm with your council and any permit or planning requirements before work begins.

## Using the app

You must **sign in** with email and password or **Google** before anything else. Use **Forgot password?** on the sign-in screen if you need a reset link. **Sign out** is in the header when you are done.

**Add council** (committing live templates or generating paste blocks for developers) is only available to **admin** accounts. Admins are accounts whose email appears in the Cloud Functions parameter `ADMIN_EMAILS` (comma-separated); after deploy, signing in applies that role automatically.

Enter a **full street address** including suburb and state (for example `123 Collins St, Melbourne VIC 3000`). Short or incomplete addresses may fail geocoding or pick the wrong area.

Choose **Tree type**: native, non-native, or noxious weed. That choice feeds the summary and native/noxious notes where relevant.

Tap **Check regulations**. The app geocodes the address, determines the **local government area (LGA)** used for council rules, and returns curated council local law notes plus AI-assisted bullets on measurement, pruning, removal, state-level considerations, and (where available) a **significant tree register** check near your point.

Read the result from top to bottom. Pay attention to **curation status** on the council block (`partial`, `verified`, or `pending`) and use the **linked primary sources** on the council site. The **Disclaimer** at the end applies to everything in the report.

After a successful lookup you can **Download PDF** or **Email the report** (PDF attached) to the address you enter. Email requires Firebase to be configured and the backend to allow sending.

If you see **Firebase is not configured**, add your web app config via `.env` from `.env.example` and rebuild.

## Adding a council

Use **Add council** when you need a curated template for an LGA — either to **save into live lookups** or to **paste into source** for `functions/src/vic-lga-tree-local-law.ts`.

Select the **canonical LGA name** from the dropdown. It must match `vic-councils.ts` exactly (same spelling and form as other councils in the app).

Add **one council page URL per line** — typically the local law, tree protection, or permits pages you used to draft the entry.

Optionally set an **instrument label** (for example the formal name of the local law) and **curation status** (`partial` is common while placeholders remain).

Tap **Commit to live lookup** to store this template in **Firestore**. The next **Check regulations** for that LGA will use it (it overrides the built-in `CURATED` map for that council when present). You must be signed in as an **admin** for commit to succeed.

Tap **Generate paste block**, then **Copy** if you also want the same object in `vic-lga-tree-local-law.ts` for version control. Replace any `TODO` lines and verify bullets against the live council pages before shipping.
