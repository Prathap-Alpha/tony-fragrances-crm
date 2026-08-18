import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Shared CRM dataset: one JSON document stored in the cloud database so every
  // device sees the same customers, products, sales, invoices, and expenses.
  let crmPool: import("mysql2/promise").Pool | null = null;
  const getCrmPool = () => {
    if (!crmPool && process.env.DATABASE_URL) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mysql = require("mysql2/promise") as typeof import("mysql2/promise");
      crmPool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 4, connectTimeout: 10000 });
    }
    return crmPool;
  };
  const ensureCrmTable = async (pool: import("mysql2/promise").Pool) => {
    await pool.execute(
      "CREATE TABLE IF NOT EXISTS tony_crm_store (id VARCHAR(64) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
    );
  };

  app.get("/api/crm", async (_req, res) => {
    try {
      const pool = getCrmPool();
      if (!pool) return res.status(503).json({ error: "database_unavailable" });
      await ensureCrmTable(pool);
      const [rows] = await pool.execute("SELECT payload FROM tony_crm_store WHERE id = 'shared' LIMIT 1");
      const list = rows as Array<{ payload: string }>;
      if (!list || list.length === 0) return res.json({ data: null });
      res.json({ data: JSON.parse(list[0].payload) });
    } catch (error) {
      console.error("[CRM] Failed to load shared data:", error);
      res.status(500).json({ error: "crm_load_failed" });
    }
  });

  app.put("/api/crm", async (req, res) => {
    try {
      const payload = req.body?.data;
      if (!payload || typeof payload !== "object") return res.status(400).json({ error: "invalid_payload" });
      const pool = getCrmPool();
      if (!pool) return res.status(503).json({ error: "database_unavailable" });
      await ensureCrmTable(pool);
      await pool.execute(
        "INSERT INTO tony_crm_store (id, payload) VALUES ('shared', ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)",
        [JSON.stringify(payload)],
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("[CRM] Failed to save shared data:", error);
      res.status(500).json({ error: "crm_save_failed" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const webRootCandidates = [
    path.resolve(__dirname, "../dist-web"),
    path.resolve(__dirname, "../../dist-web"),
  ];
  const webRoot = webRootCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ?? webRootCandidates[0];
  app.use(express.static(webRoot, { index: "index.html", maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/manus-storage/")) return next();
    res.sendFile(path.join(webRoot, "index.html"));
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
