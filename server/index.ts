import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDB } from "./db";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Connect to MongoDB (will fall back to in-memory if not available)
  await connectDB();

  // Initialize super admin only if using MongoDB
  // In-memory storage already has super admin initialized
  const { isMongoDBAvailable } = await import('./db');
  if (isMongoDBAvailable) {
    const superAdminExists = await Admin.findOne({ role: 'superadmin' });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const superAdmin = new Admin({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Super Administrator',
        role: 'superadmin',
      });
      await superAdmin.save();
      log('✅ Super admin created (username: admin, password: admin123)');
    } else {
      log('✅ Super admin already exists');
    }
  } else {
    log('✅ Using in-memory storage with pre-initialized super admin (username: admin, password: admin123)');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
// ALWAYS serve the app on the port specified in the environment variable PORT
const port = parseInt(process.env.PORT || '5000', 10);

// If running locally (development) prefer IPv4 loopback to avoid Windows issues.
// In production (Render), we want to listen on 0.0.0.0 so the platform can route traffic.
const host = process.env.HOST || (process.env.NODE_ENV === 'development' ? '127.0.0.1' : '0.0.0.0');

server.listen(
  {
    port,
    host,
  },
  () => {
    log(`✅ Server running at http://${host}:${port}`);
  }
);


})();
