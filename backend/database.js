const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

async function openDb() {
  return open({
    filename: './cjud.db',
    driver: sqlite3.Database,
  });
}

async function setup() {
  const db = await openDb();

  await db.exec(`
          CREATE TABLE IF NOT EXISTS agendamentos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT,
              startDate TEXT,
              endDate TEXT,
              startTime TEXT,
              endTime TEXT,
              location TEXT,
              equipments TEXT,
              presence TEXT,
              notes TEXT,
              is_prioritized INTEGER DEFAULT 0,
              responsible_interns TEXT DEFAULT '[]',
              equipments_checked TEXT DEFAULT '[]',
              grupo_evento TEXT NULL,
              created_by TEXT NULL
          )
      `);

  await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE, 
              password TEXT NOT NULL,
              role TEXT NOT NULL
          )
      `);

  await db.exec(`
          CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              intern_name TEXT NOT NULL,
              message TEXT NOT NULL,
              is_read INTEGER DEFAULT 0,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
      `);

  await db.exec(`
          CREATE TABLE IF NOT EXISTS gestor_notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              gestor_email TEXT NOT NULL,
              agendamento_id INTEGER,
              message TEXT NOT NULL,
              type TEXT NOT NULL,
              is_read INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
      `);

  console.log('Estrutura das tabelas configurada com sucesso.');
}

module.exports = { openDb, setup };
