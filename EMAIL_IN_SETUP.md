# Email-in setup (placeholder)

Forward an RFQ email to a Vantorflow address and it becomes an opportunity automatically.
Right now the route works, but no real mailbox is connected yet, so you can only test it by calling the URL yourself.

## What the route does
POST https://vantorflow.vercel.app/api/email-in with the header `x-vf-ingest-secret: <EMAIL_IN_SECRET>` and JSON body `{ "from": "...", "subject": "...", "body": "..." }`.
- subject becomes the opportunity title and the RFQ title.
- body becomes the RFQ text (at least 20 characters).
- buyer comes from the sender's display name, or the sender's domain if there is no name.
- The opportunity is created for the owner set in `EMAIL_IN_OWNER_ID`.

## Vercel environment variables (set these in the Vercel project)
- EMAIL_IN_SECRET: a long random string. Generate one with `openssl rand -hex 32`.
- EMAIL_IN_OWNER_ID: the Supabase auth user id of the account that should receive emails.

Without both variables the route returns 503 "Email ingest is not configured yet."

## Cloudflare Email Routing worker (for later, not yet deployed)
1. In Cloudflare, add the domain, enable Email Routing, and create a custom address such as rfq@vantorflow.com.ng.
2. Create a Worker with an `email` handler that reads the message and posts to the ingest URL:

```js
export default {
  async email(message, env) {
    const body = await new Response(message.raw).text();
    await fetch("https://vantorflow.vercel.app/api/email-in", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vf-ingest-secret": env.EMAIL_IN_SECRET },
      body: JSON.stringify({ from: message.from, subject: message.headers.get("subject") || "", body }),
    });
  },
};
```

3. Store the secret with `wrangler secret put EMAIL_IN_SECRET` and point the Email Routing rule at the Worker.
4. The `body` above is the raw MIME message. Parsing it into plain text is a later step (use a MIME parser in the worker).

## Test it
curl -X POST https://vantorflow.vercel.app/api/email-in -H "x-vf-ingest-secret: $SECRET" -H "content-type: application/json" -d '{"from":"Procurement <buyer@acme.com>","subject":"RFQ: office supplies","body":"Please quote for 200 chairs and delivery to Lagos within 30 days."}'
