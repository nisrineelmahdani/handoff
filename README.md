# Handoff

Handoff turns developer logs into editable Markdown bug reports. It previews masked bearer tokens and internal hostnames, uses Chrome's on-device model to draft the issue, and can polish an approved draft with Firebase AI Logic. You can copy the Markdown or save it to reopen later in the same browser profile.

The on-device draft uses only the redaction preview and runs without a cloud fallback. Cloud polishing sends the exact draft shown in the confirmation panel. Saving stores the report title, Markdown, and server-generated update time in Firestore. Review the preview and report before sharing or saving real logs.

## Run locally

Use Node.js 20.9 or newer and a supported desktop Chrome with its on-device model available. Follow the [Firebase AI Logic desktop Chrome setup guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) if the local model needs to download.

```sh
npm ci
cp .env.example .env.local
```

Complete the Firebase setup below, then run `npm run dev` and open [http://localhost:3000](http://localhost:3000). Use the `localhost` hostname for the cloud demo.

## Firebase setup

1. Create a Firebase project and register a web app. Copy its `apiKey`, `authDomain`, `projectId`, and `appId` into the matching fields in `.env.local`. These values are part of the browser bundle. Use the web app's Firebase API key with Firebase API restrictions. Keep direct Gemini API keys, service-account credentials, and App Check debug tokens private. [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys)
2. In the Firebase console, set up **Firebase AI Logic** with the **Gemini Developer API** provider and keep App Check enforcement enabled for AI Logic. [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started)
3. Enable **Anonymous** under **Authentication → Sign-in method**. Handoff restores the browser's Firebase session before creating an anonymous account. [Firebase Anonymous Auth](https://firebase.google.com/docs/auth/web/anonymous-auth)
4. Create the default **Cloud Firestore** database. Open its **Rules** tab, paste [firestore.rules](firestore.rules), and click **Publish**. The rules allow the authenticated owner to read, list, create, and update reports under `users/{uid}/drafts/{draftId}`. All other client access is denied. [Publishing Firestore rules](https://firebase.google.com/docs/firestore/security/get-started)
5. On localhost, open Chrome DevTools and click **Test cloud AI** to generate the browser's App Check debug token during initial setup. Register it for your web app under **App Check → Apps → Manage debug tokens**, then retry. Once registered, cloud polishing works directly from the confirmation panel. [App Check debug provider](https://firebase.google.com/docs/app-check/web/debug-provider)

The cloud demo currently uses localhost-only App Check debug mode. A hosted cloud demo needs a production App Check provider and corresponding application configuration before release.

## Try the checkout example

1. Leave the synthetic checkout logs prefilled and click **Preview redaction**. Check that the internal hostname and bearer token become `[INTERNAL_HOST]` and `[REDACTED_TOKEN]`.
2. Click **Generate draft locally**. The editable report should preserve `504` and `409 ORDER_ALREADY_EXISTS`, mark reproduction steps unknown, and ask whether the first request created an order before it timed out. The fixture supplies no response body. To try offline generation, load the page and download the Chrome model first, then disconnect before generating.
3. Reconnect if needed. Edit the report, click **Polish in cloud**, review the exact Markdown, then click **Send to cloud**. The result appears in the editable **Polished in cloud** field.
4. Click **Copy Markdown** or **Save draft** from either editor. With Firestore configured, reload in the same browser profile, reopen a report from **Saved drafts**, edit it, and save again. The same entry moves to the top.

## Checks

```sh
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

If your sandbox blocks Turbopack from binding a local worker port, run `npm run build -- --webpack`.

## License

[MIT](LICENSE)
