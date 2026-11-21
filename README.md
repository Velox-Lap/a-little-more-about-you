# A Little More About You

A mobile-first Thai questionnaire with a separate owner dashboard. GitHub Pages serves the static website; Supabase stores responses and enforces owner-only reads.

## Live project configuration

- Supabase project: `A-Little-More-About-You`
- Project ref: `dcpbqbrpwazyleywuiat`
- Region: `ap-southeast-1` (Singapore)
- Project URL and publishable key are configured in `assets/config.js`.
- The database migrations are already applied.
- The owner account has already been added to `private.app_admins` and owner verification has been tested successfully.

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
│   ├── questions.js
│   └── styles.css
└── supabase/
    ├── bootstrap-owner.sql
    └── schema.sql
```

## Pages

- `index.html`: 80-question experience, one question at a time, back/skip, review, and submit.
- `admin.html`: owner sign-in and private response dashboard.
- `assets/`: responsive styling, question bank, questionnaire logic, admin logic, and browser-safe Supabase configuration.
- `supabase/schema.sql`: database schema and policies matching the live project.
- `supabase/bootstrap-owner.sql`: optional SQL for intentionally adding or re-adding an owner. The current owner is already configured; do not run this unless necessary.

## Privacy and security model

- Public visitors use the `anon` role and can only INSERT into `public.questionnaire_responses`.
- Anonymous clients have no SELECT, UPDATE, or DELETE grants or policies.
- Authenticated users have SELECT privilege, but RLS returns rows only when their `auth.uid()` is present in `private.app_admins`.
- The owner allowlist is stored in the non-exposed `private` schema and cannot be read directly by browser roles.
- `public.is_questionnaire_owner()` returns only a boolean and is used by the dashboard for owner verification.
- The frontend contains only the Supabase publishable key. Never add a service-role key or secret key to this repository.

The repository is public. This is acceptable for the current configuration because the source contains no database secret; response confidentiality is enforced by Supabase grants and RLS, not by hiding the HTML or JavaScript.

## Owner access

The owner account has already been created in Supabase Auth and added to `private.app_admins`.

1. Sign in at the deployed `/admin.html` page using the existing owner email and password.
2. In Supabase **Authentication → Settings / Sign In**, disable public user sign-ups. Respondents do not need Supabase accounts; anonymous submissions continue to work.
3. Do not add other users to `private.app_admins`; only approved IDs can read the responses.

## Publish with GitHub Pages

The source files are committed to the `main` branch at the repository root.

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then save.
4. Wait for the Pages deployment. The expected public URL is:

   `https://velox-lap.github.io/a-little-more-about-you/`

5. The public questionnaire is the URL above. The owner dashboard is `https://velox-lap.github.io/a-little-more-about-you/admin.html`.

The GitHub Pages setting must be enabled in repository settings; the connected GitHub tools in this session can commit files but cannot enable the Pages setting through the Pages API.

## Test before sharing

1. Open the public questionnaire and submit a small test response.
2. Open `/admin.html` and sign in with the existing owner account.
3. Confirm the test response is visible in the dashboard.
4. Sign out and verify that the dashboard requires authentication.
5. Confirm that no test response remains if you delete the test from the database as an owner using the Supabase Dashboard.

## Operational notes

- Questions are optional; respondents may skip questions and should share only what they are comfortable sharing.
- Public submit endpoints can receive spam. For wider public use, add server-side rate limiting or CAPTCHA; do not rely on frontend-only controls.
- Never commit answer exports, passwords, access tokens, or service-role keys.
