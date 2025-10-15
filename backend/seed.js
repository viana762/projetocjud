// backend/seed.js

const { openDb } = require('./database.js');
const bcrypt = require('bcrypt');

// Lista de usuários reais para serem criados no sistema.
const usersToCreate = [
  // Supervisores
  {
    name: 'Maikon Pagani',
    email: 'mmpagani@tjrs.jus.br',
    password: 'cjud@321',
    role: 'SUPERVISOR',
  },
  {
    name: 'Cassius Côrtes',
    email: 'ccortes@tjrs.jus.br',
    password: 'cjud@321',
    role: 'SUPERVISOR',
  },

  // Estagiários
  {
    name: 'Quetlin Pavinatto',
    email: 'qpavinatto@tjrs.jus.br',
    password: 'cjud@321',
    role: 'ESTAGIARIO',
  },
  {
    name: 'Lian Fernandes',
    email: 'lianfernandes@tjrs.jus.br',
    password: 'cjud@321',
    role: 'ESTAGIARIO',
  },
  {
    name: 'Guilherme Ferreira',
    email: 'guilhermef@tjrs.jus.br',
    password: 'cjud@321',
    role: 'ESTAGIARIO',
  },
  {
    name: 'Guilherme Viana',
    email: 'gvcamargo@tjrs.jus.br',
    password: 'cjud@321',
    role: 'ESTAGIARIO',
  },
];

// Esta função vai ler a lista acima e criar cada usuário no banco de dados.
async function seed() {
  console.log('Iniciando a criação de usuários...');
  const db = await openDb();

  // Limpa a tabela de usuários para garantir que não haja duplicatas
  await db.run('DELETE FROM users');

  // Percorre a lista e cria cada usuário
  for (const user of usersToCreate) {
    // Embaralha a senha para segurança
    const hashedPassword = await bcrypt.hash(user.password, 10);

    // Insere o usuário no banco de dados
    await db.run(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [user.name, user.email, hashedPassword, user.role]
    );
    console.log(`- Usuário '${user.name}' criado com sucesso.`);
  }

  console.log('\nTodos os usuários foram cadastrados!');
  console.log(
    'Pode ligar o servidor principal agora com o comando: node server.js'
  );
}

// Executa a função
seed();
