# Automatic Instagram video feed setup

The **Fresh Fits, Just Dropped** section uses the newest five Instagram video/Reel links when the shop account is connected. Instagram credentials stay on the server; they must never be pasted into `index.html` or committed to GitHub.

## Connect the shop account

1. The Instagram account must be a Professional account (Business or Creator).
2. In Meta for Developers, create an app and set up Instagram Login/API access with the `instagram_business_basic` permission.
3. Authorize the shop's Instagram account and obtain its numeric Instagram user ID and an access token.
4. In the Vercel project, open **Settings → Environment Variables** and add these for **Production**:
   - `INSTAGRAM_USER_ID`: the numeric Instagram user ID.
   - `INSTAGRAM_ACCESS_TOKEN`: the account access token (keep this value private).
   - `INSTAGRAM_API_VERSION`: optional; the feed defaults to `v26.0`.
5. Redeploy the site after saving the variables.

The endpoint refreshes its cached response every 15 minutes. If the account is not connected, or Instagram is temporarily unavailable, the site keeps showing the saved Instagram links. Keep the access token valid and replace it in Vercel when it expires.

Meta's Instagram API is limited to Professional accounts: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
