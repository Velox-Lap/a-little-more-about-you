# A Little More About You

A mobile-first Thai questionnaire with a separate owner dashboard. GitHub Pages serves the static site; Supabase stores responses and enforces owner-only reads.

## Project status

- Supabase project: `A-Little-More-About-You`
- Project ref: `dcpbqbrpwazyleywuiat`
- Region: `ap-southeast-1` (Singapore)
- Project URL and publishable key are configured in `assets/config.js`.
- Database migrations are applied: private response table, anonymous INSERT-only access, authenticated owner-only SELECT, and owner verification RPC.
- Owner account has been added to `private.app_admins`; the owner RPC test returned `true`.
- The publishable key and project URL are already configured in `assets/config.js`.
- The website source is ready to push to a GitHub repository. The repository itself has not yet been created.

## What's included

- `index.html`: 80-question experience, one question at a time, back/skip, review, and submit.
- `admin.html`: owner sign-in and private response dashboard.
- `assets/`: design, questions, app logic, admin logic, and browser-safe Supabase configuration.
- `supabase/schema.sql`: full database setup matching the live migrations.
- `supabase/bootstrap-owner.sql`: add your Auth account to the private owner allowlist after creating it.

## Privacy model

- Visitors use the `anon` role and can only INSERT into `public.questionnaire_responses`.
- Anonymous clients have no SELECT, UPDATE, or DELETE table grants or policies.
- Authenticated users receive SELECT privilege, but the RLS policy returns rows only when `auth.uid()` exists in `private.app_admins`.
- The admin allowlist is in a non-exposed `private` schema; browser roles cannot read it.
- `public.is_questionnaire_owner()` only returns a boolean and is used by the dashboard to verify that the signed-in account is an approved owner.
- The browser config contains only the publishable key. Never put a service-role or secret key in this repository.

## Owner setup status

The owner account has already been created in Supabase Auth and added to `private.app_admins`. Its owner-verification RPC returned `true` in a database-role test. **Do not run `supabase/bootstrap-owner.sql` again unless you are intentionally adding or re-adding an owner.**

Before sharing the public questionnaire:

1. Open `admin.html` after deploying and sign in with the same email/password created in Supabase Auth.
2. In Supabase **Authentication → Settings / Sign In / Providers**, turn off public sign-ups. Respondents do not need Supabase accounts.
3. Do not add any other user to `private.app_admins`; only users in that table can read responses.

## Test before sharing

1. Open `index.html` in a browser over a local static server or after publishing to GitHub Pages.
2. Submit a test response with a nickname and a few answers.
3. Sign in at `admin.html` with the owner account and confirm the test response appears.
4. Sign out and verify the admin dashboard cannot load response data.
5. In a separate private browser session, try to read `questionnaire_responses` through the Supabase client; the `anon` role must be denied.

## Publish with GitHub Pages

1. Create a new repository in the GitHub account.
2. Upload the contents of this project to the repository root (`index.html`, `admin.html`, `assets/`, `supabase/`, and `.nojekyll`).
3. In **Settings → Pages**, select **Deploy from a branch**, choose `main`, and select `/ (root)`.
4. Wait for the Pages deployment to finish. Share the generated public site URL, not the admin URL.

If GitHub Pages is not available for the repository visibility/plan you choose, use a public repository or another static hosting provider. The privacy of answers does not depend on the repository being private: answer privacy is enforced by Supabase RLS.

## Notes

- The questionnaire contains optional free-text prompts. Respondents can skip anything and submit only what they are comfortable sharing.
- The public submit endpoint can receive spam. For broader public use, add a server-side rate limit or CAPTCHA; do not rely on frontend-only restrictions.
- Never commit answer exports, passwords, access tokens, or service-role keys.
