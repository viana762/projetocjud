const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs'); // Necessário para interagir com ficheiros

async function openDb() {
  return open({
    filename: './cjud.db',
    driver: sqlite3.Database,
  });
}

async function setup() {
  const db = await openDb();

  // --- LINHA TEMPORÁRIA PARA FORÇAR RECRIAÇÃO ---
  // Esta linha apaga a tabela 'agendamentos' se ela existir.
  // REMOVA esta linha após o primeiro deploy bem-sucedido!
  try {
    await db.exec('DROP TABLE IF EXISTS agendamentos');
    console.log('Tabela agendamentos antiga removida (se existia).');
  } catch (dropError) {
    console.error(
      'Erro ao tentar remover tabela antiga (ignorado):',
      dropError
    );
  }
  // --- FIM DA LINHA TEMPORÁRIA ---

  // Cria a tabela 'agendamentos' com a estrutura correta (inclui equipments_checked)
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
              equipments_checked TEXT DEFAULT '[]' 
          )
      `);

  // Tabelas 'users' e 'notifications' (sem mudanças)
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

  console.log('Estrutura das tabelas configurada com sucesso.');
}

module.exports = { openDb, setup };
