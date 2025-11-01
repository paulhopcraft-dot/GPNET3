# GPNet3 Full Integration (UI + scaffolding)

This bundle restores the GPNet2-style Dashboard + Employee screens into GPNet3 and adds commented-out AI/voice scaffolding.

## Install
Unzip into your GPNet3 project root. You should see `client/` and `server/` folders merge.

## Enable routes
In `server/src/index.ts` add:
```ts
import voicegp from "./routes/voicegp";
app.use("/api/voicegp", voicegp);
```

## Run
```
npm run dev
```

## Notes
- AI (ChatGPT / ElevenLabs / Pinecone) is **disabled** by default.
- When ready, implement `queryDB`/`queryDocs` and uncomment external imports.
