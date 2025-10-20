const { openDb } = require('./database.js');
const bcrypt = require('bcryptjs');

const usersToCreate = [
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

async function seed() {
  console.log('Iniciando a criação de usuários...');
  const db = await openDb();

  await db.run('DELETE FROM users');

  for (const user of usersToCreate) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

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

seed();
