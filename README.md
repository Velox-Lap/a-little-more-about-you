# A Little More About You

A mobile-first Thai questionnaire that turns getting to know someone into a relaxed conversation. The respondent chooses which prompts to answer, can add optional follow-up answers, and reviews everything before submitting.

## Live project

- GitHub repository: https://github.com/Velox-Lap/a-little-more-about-you
- Public questionnaire: https://velox-lap.github.io/a-little-more-about-you/
- Owner dashboard: https://velox-lap.github.io/a-little-more-about-you/admin.html
- Supabase project: `A-Little-More-About-You`
- Project ref: `dcpbqbrpwazyleywuiat`
- Region: `ap-southeast-1` (Singapore)

## Project structure

```text
.
├── index.html
├── admin.html
├── README.md
├── .nojekyll
├── assets/
│   ├── admin.js
│   ├── app.js
│   ├── config.js
│   ├── conversation.js
│   ├── questions.js
│   ├── styles.css
│   └── theme.css
└── supabase/
    ├── bootstrap-owner.sql
    └── schema.sql
```

## Respondent experience

- 15 selected main prompts across three optional levels: Ice Breaking, Understanding, and Deep Connection.
- Questions can be answered in any order; unanswered prompts can be skipped.
- Each main answer may reveal related follow-up prompts. Follow-ups are optional.
- Respondents can review their answers before submitting.
- The experience is designed for mobile and desktop.

## Owner dashboard

- Sign in at `admin.html` using the owner account created in Supabase Auth.
- The dashboard verifies ownership with `public.is_questionnaire_owner()` before loading responses.
- Responses include the nickname, main answers, follow-up answers, and submission time.
- Only approved owner UUIDs in `private.app_admins` can read response rows.

## Current deployment and configuration

- GitHub Pages publishes from `main` at the repository root.
- The public URL is `https://velox-lap.github.io/a-little-more-about-you/`.
- `assets/config.js` contains the verified Supabase URL and publishable key for project `dcpbqbrpwazyleywuiat`.
- **Keep the current live `assets/config.js` when syncing project files.** An older copy in a supplied ZIP may contain a key for a different Supabase project and cause `Invalid API key`.
- The key in `assets/config.js` is a publishable key intended for browser use. Never expose a `service_role` key or a secret key in this repository.

## Privacy and database security

- Visitors use the Supabase `anon` role and can only INSERT into `public.questionnaire_responses`.
- Anonymous clients have no SELECT, UPDATE, or DELETE privileges or RLS policies.
- Authenticated users have table-level SELECT privilege, but RLS allows rows only when `auth.uid()` is registered in `private.app_admins`.
- The owner allowlist is in the non-exposed `private` schema and browser roles cannot read it directly.
- `public.is_questionnaire_owner()` returns only a boolean for the admin UI.
- The live owner account has already been added to `private.app_admins`; do not run `supabase/bootstrap-owner.sql` again unless intentionally adding another approved owner.

## Supabase setup notes

The live database migrations have already been applied. `supabase/schema.sql` is a reference schema file for reproducing the database in a separate project. Do not run it against the live project just to deploy the frontend.

Public respondents do not need Supabase accounts. Disable public sign-ups in Supabase Authentication settings after the owner account exists. Keep the owner email/password private, and do not add other users to `private.app_admins`.

## Test checklist

1. Open the public questionnaire and check that the service status reports the private submission service is ready.
2. Enter a nickname, choose a few prompts across all three levels, and try at least one follow-up.
3. Review the answers and submit a test response.
4. Open the owner dashboard and sign in using the approved owner account.
5. Confirm that the main answers and follow-up answers appear in the same submission.
6. Sign out. A non-owner account must not be able to read any responses.

The database access model has been tested directly: anonymous INSERT succeeds, anonymous SELECT/UPDATE/DELETE are denied, and an unapproved authenticated user sees zero response rows. A final end-to-end browser submission should still be performed after deployment.

## References for interaction and visual direction

- Figma Riff “Card shuffle” for a layered card transition.
- Figma Riff “Dynamic counter” for an animated answer count.
- Questionnaire onboarding and progress-bar prototypes for one-question-at-a-time hierarchy and navigation.
- Friendzy / Cupid Arrow UI references for a soft, friendly visual treatment.
- Siriraj questionnaire-site reference for Thai-language questionnaire context.

These references informed interaction and visual direction; their source assets are not bundled into this repository.

## Operational notes

- All responses are optional. Respondents should share only what they are comfortable sharing.
- Public insert endpoints can receive spam. For wider public use, add server-side rate limiting or CAPTCHA; do not rely on frontend-only restrictions.
- Never commit answer exports, passwords, access tokens, or service-role keys.
