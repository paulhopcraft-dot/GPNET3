import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { TranscriptIngestionModule } from "./services/transcripts";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

const transcriptModule = new TranscriptIngestionModule();

const startServer = async () => {
  await transcriptModule.start();
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  const isDev = app.get("env") === "development";

  if (isDev) {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });

    try {
      await setupVite(app, server);
    } catch (error) {
      server.close();
      throw error;
    }
  } else {
    serveStatic(app);
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  }
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

let shuttingDown = false;
const gracefulShutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await transcriptModule.stop();
  } catch (err) {
    console.error("Transcript module shutdown error", err);
  }
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
