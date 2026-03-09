import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import ffmpeg from "fluent-ffmpeg";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("alerts.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    confidence REAL,
    image_data TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Supabase Client (Optional)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb', strict: false }));

  // API Routes
  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50").all();
    res.json(alerts);
  });

  app.post("/api/alerts", async (req, res) => {
    const { type, confidence, image_data } = req.body;
    
    // Save locally
    const stmt = db.prepare("INSERT INTO alerts (type, confidence, image_data) VALUES (?, ?, ?)");
    const info = stmt.run(type, confidence, image_data);
    
    // Sync to Supabase if available
    if (supabase) {
      try {
        await supabase.from('alerts').insert([{
          type,
          confidence,
          image_data,
          timestamp: new Date().toISOString()
        }]);
      } catch (err) {
        console.error("Supabase sync error:", err);
      }
    }

    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/alerts", (req, res) => {
    db.prepare("DELETE FROM alerts").run();
    res.json({ status: "ok" });
  });

  app.delete("/api/alerts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
    res.json({ status: "ok" });
  });

  // ROI Persistence
  app.get("/api/roi", (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'roi'").get() as { value: string } | undefined;
    res.json(row ? JSON.parse(row.value) : null);
  });

  app.post("/api/roi", (req, res) => {
    const roi = JSON.stringify(req.body);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('roi', ?)").run(roi);
    res.json({ status: "ok" });
  });

  // General Settings Persistence
  app.get("/api/settings", (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'app_settings'").get() as { value: string } | undefined;
    res.json(row ? JSON.parse(row.value) : { threshold: 0.4, cooldown: 5000, audioEnabled: true, debugMode: false });
  });

  app.post("/api/settings", (req, res) => {
    const settings = JSON.stringify(req.body);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)").run(settings);
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  const RTSP_URL = "rtsp://admin:Trung12%4012@14.224.217.189:554/Streaming/Channels/402";

  let ffmpegProcess: any = null;

  function startStreaming() {
    if (ffmpegProcess) return;

    console.log("Starting RTSP stream...");
    ffmpegProcess = ffmpeg(RTSP_URL)
      .addOptions([
        "-f image2",
        "-update 1",
        "-r 5", // 5 frames per second
      ])
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        ffmpegProcess = null;
        setTimeout(startStreaming, 5000); // Retry after 5 seconds
      })
      .on("end", () => {
        console.log("FFmpeg stream ended");
        ffmpegProcess = null;
        setTimeout(startStreaming, 5000);
      })
      .pipe();

    ffmpegProcess.on("data", (chunk: Buffer) => {
      // Broadcast binary frame to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(chunk);
        }
      });
    });
  }

  // Alternative approach: Use ffmpeg to output to a stream and pipe to WS
  // But standard ffmpeg image2 output might be tricky to pipe directly as chunks.
  // Let's use a more robust approach for frame extraction.

  function startStreamingRobust() {
    if (ffmpegProcess) return;

    console.log("Starting RTSP stream (robust)...");
    
    // We'll use ffmpeg to output JPEGs to stdout
    ffmpegProcess = ffmpeg(RTSP_URL)
      .native() // Read at native frame rate
      .inputOptions([
        '-rtsp_transport tcp' // Use TCP for RTSP to avoid packet loss
      ])
      .outputOptions([
        '-f image2pipe',
        '-vcodec mjpeg',
        '-q:v 5', // Quality 1-31 (lower is better)
        '-vf fps=5' // 5 FPS
      ])
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        ffmpegProcess = null;
        setTimeout(startStreamingRobust, 5000);
      })
      .on('end', () => {
        console.log('FFmpeg stream ended');
        ffmpegProcess = null;
        setTimeout(startStreamingRobust, 5000);
      });

    const ffStream = ffmpegProcess.pipe();
    
    let buffer = Buffer.alloc(0);
    ffStream.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      // Find JPEG start and end markers
      let start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
      let end = buffer.indexOf(Buffer.from([0xff, 0xd9]));
      
      while (start !== -1 && end !== -1 && end > start) {
        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);
        
        // Broadcast frame
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(frame);
          }
        });
        
        start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
        end = buffer.indexOf(Buffer.from([0xff, 0xd9]));
      }
      
      // Keep buffer size reasonable
      if (buffer.length > 10 * 1024 * 1024) {
        buffer = Buffer.alloc(0);
      }
    });
  }

  startStreamingRobust();

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.on("close", () => console.log("WebSocket connection closed"));
  });
}

startServer();
