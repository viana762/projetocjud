// backend/database.js

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: './cjud.db',
    driver: sqlite3.Database,
  });
}

async function setup() {
  const db = await openDb();

  // MUDANÇA AQUI: Tabela de agendamentos agora tem data de início e fim
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
            responsible_interns TEXT DEFAULT '[]'
        )
    `);

  // Tabela de usuários (sem mudanças)
  await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE, 
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    `);

  // Tabela de notificações (sem mudanças)
  await db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_name TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

  console.log(
    'Tabelas de agendamentos (com data de início/fim), usuários e notificações configuradas com sucesso.'
  );
}

module.exports = { openDb, setup };
