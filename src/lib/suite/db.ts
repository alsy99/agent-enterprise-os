import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "suite.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      rules_json TEXT NOT NULL,
      guardrails_json TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      playbook_json TEXT NOT NULL DEFAULT '[]',
      stats_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_heartbeat_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      objective_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_capability TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_agent_id TEXT,
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (objective_id) REFERENCES objectives(id),
      FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      related_task_id TEXT,
      related_objective_id TEXT,
      created_at TEXT NOT NULL,
      importance REAL NOT NULL DEFAULT 0.5,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS handoffs (
      id TEXT PRIMARY KEY,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      objective_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      context_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      FOREIGN KEY (from_agent_id) REFERENCES agents(id),
      FOREIGN KEY (to_agent_id) REFERENCES agents(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (objective_id) REFERENCES objectives(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS worker_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
    CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  `);

  const columns = database
    .prepare(`PRAGMA table_info(agents)`)
    .all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === "job_profile")) {
    database.exec(
      `ALTER TABLE agents ADD COLUMN job_profile TEXT NOT NULL DEFAULT ''`,
    );
  }
}

export function resetDbConnection() {
  if (db) {
    db.close();
    db = null;
  }
}
