const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
// IMPORTAÇÃO NOVA (BREVO)
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { openDb, setup } = require('./database.js');

const EMAIL_FIXO_DESTINO = 'vianagemini99@gmail.com';

// --- INÍCIO DA NOVA FUNÇÃO DE E-MAIL (VIA BREVO API) ---
async function enviarEmailConfirmacao(agendamentoDados, novoId) {
  try {
    // 1. Configura o cliente da Brevo
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];

    // !! MUDANÇA IMPORTANTE AQUI !!
    // Agora, ele pega a chave das Variáveis de Ambiente da Render
    apiKey.apiKey = process.env.BREVO_API_KEY;
    // A chave "xsmtpsib-..." foi REMOVIDA do código.

    // 2. Prepara a API de e-mail transacional
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // 3. Define os e-mails
    const remetente = {
      name: 'CJUD - Agendamentos',
      email: 'sistema.cjud.agendamentos@outlook.com',
    };
    const destinatarioFixo = [
      {
        email: EMAIL_FIXO_DESTINO,
        name: 'Agendamentos CJUD',
      },
    ];
    const copiaSolicitante = [
      {
        email: agendamentoDados.schedulerEmail,
        name: 'Solicitante',
      },
    ];

    // 4. Monta o conteúdo do e-mail
    sendSmtpEmail.subject = `Confirmação de Agendamento: ${agendamentoDados.title}`;
    sendSmtpEmail.htmlContent = `
      <h3>Agendamento Criado com Sucesso! (ID: ${novoId})</h3>
      <p>O agendamento a seguir foi criado por ${
        agendamentoDados.schedulerEmail
      }:</p>
      <ul>
          <li><strong>Título:</strong> ${agendamentoDados.title}</li>
          <li><strong>Período:</strong> ${agendamentoDados.startDate} ${
        agendamentoDados.startTime
      } a ${agendamentoDados.endDate} ${agendamentoDados.endTime}</li>
          <li><strong>Local:</strong> ${agendamentoDados.location}</li>
          <li><strong>Equipamentos Solicitados:</strong> ${
            agendamentoDados.equipments.join(', ') || 'Nenhum'
          }</li>
          <li><strong>Observações:</strong> ${agendamentoDados.notes || 'Nenhuma'}</li>
      </ul>
      <p>Acesse o painel para mais detalhes.</p>
    `;

    // 5. Configura e envia o e-mail
    sendSmtpEmail.sender = remetente;
    sendSmtpEmail.to = destinatarioFixo;
    sendSmtpEmail.cc = copiaSolicitante;
    sendSmtpEmail.replyTo = remetente;

    // 6. Tenta enviar e monitora o resultado
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(
      `E-mail (Agendamento ID: ${novoId}) enviado com sucesso via Brevo. MessageId: ${data.messageId}`
    );
  } catch (emailError) {
    console.error(
      `ERRO GRAVE AO ENVIAR E-MAIL PELA BREVO (Agendamento ID: ${novoId}):`,
      emailError.response ? emailError.response.body : emailError.message
    );
  }
}
// --- FIM DA NOVA FUNÇÃO DE E-MAIL ---

async function startServer() {
  try {
    await setup();
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors());

    app.use(express.json());

    app.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const db = await openDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [
          email,
        ]);
        if (!user) {
          return res.status(404).json({ message: 'E-mail não encontrado.' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
          return res.status(401).json({ message: 'Senha incorreta.' });
        }
        res.json({
          message: 'Login bem-sucedido!',
          user: { name: user.name, role: user.role, email: user.email },
        });
      } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
      }
    });

    app.get('/equipe', async (req, res) => {
      try {
        const db = await openDb();
        const users = await db.all(
          'SELECT id, name, email, role FROM users ORDER BY role DESC, name ASC'
        );
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar a equipe.' });
      }
    });

    app.get('/estagiarios', async (req, res) => {
      try {
        const db = await openDb();
        const interns = await db.all(
          "SELECT name FROM users WHERE role = 'ESTAGIARIO' ORDER BY name ASC"
        );
        res.json(interns);
      } catch (error) {
        res
          .status(500)
          .json({ message: 'Erro ao buscar a lista de estagiários.' });
      }
    });

    app.post('/users', async (req, res) => {
      try {
        const { name, email, role } = req.body;
        const defaultPassword = 'mudar123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        const db = await openDb();
        await db.run(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          [name, email, hashedPassword, role]
        );
        res
          .status(201)
          .json({
            message: `Usuário ${name} criado com sucesso! A senha padrão é 'mudar123'.`,
          });
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
          return res
            .status(409)
            .json({ message: 'Este e-mail já está cadastrado.' });
        }
        res.status(500).json({ message: 'Erro ao criar o usuário.' });
      }
    });

    app.put('/users/change-name', async (req, res) => {
      try {
        const { email, newName } = req.body;
        const db = await openDb();
        await db.run('UPDATE users SET name = ? WHERE email = ?', [
          newName,
          email,
        ]);
        res.json({ message: 'Nome alterado com sucesso!', newName: newName });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar o nome.' });
      }
    });

    app.put('/users/change-password', async (req, res) => {
      try {
        const { email, currentPassword, newPassword } = req.body;
        const db = await openDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [
          email,
        ]);
        if (!user) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const isPasswordCorrect = await bcrypt.compare(
          currentPassword,
          user.password
        );
        if (!isPasswordCorrect) {
          return res.status(401).json({ message: 'Senha atual incorreta.' });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ? WHERE email = ?', [
        t hashedNewPassword,
          email,
        ]);
        res.json({
          message:
            'Senha alterada com sucesso! Por favor, faça o login novamente.',
        });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar a senha.' });
      }
    });

    // ROTA DE AGENDAMENTOS (MODIFICADA)
    app.post('/agendamentos', async (req, res) => {
      try {
        const {
          title,
          startDate,
          endDate,
          startTime,
          endTime,
          location,
          equipments,
          presence,
          notes,
          schedulerEmail,
        } = req.body;
        const db = await openDb();
        const result = await db.run(
          'INSERT INTO agendamentos (title, startDate, endDate, startTime, endTime, location, equipments, presence, notes, is_prioritized, responsible_interns) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            title,
            startDate,
            endDate,
            startTime,
            endTime,
            location,
            JSON.stringify(equipments),
            presence,
            notes,
            0,
            '[]',
          ]
        );
        const novoId = result.lastID;

        res.status(201).json({ message: 'Agendamento criado com sucesso!' });

        enviarEmailConfirmacao(req.body, novoId);
      } catch (dbError) {
        console.error('ERRO AO SALVAR AGENDAMENTO NO BANCO DE DADOS:', dbError);
        res
          .status(500)
          .json({ message: 'Erro interno ao salvar o agendamento.' });
      }
    });

    app.put('/agendamentos/:id/check-equipamentos', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        const { equipmentsChecked } = req.body;
        await db.run(
          'UPDATE agendamentos SET equipments_checked = ? WHERE id = ?',
          [JSON.stringify(equipmentsChecked), id]
        );
        res.json({
          message: 'Checklist de equipamentos atualizado com sucesso!',
        });
      } catch (error) {
        console.error('ERRO AO ATUALIZAR CHECKLIST:', error);
        res.status(500).json({ message: 'Erro ao atualizar checklist.' });
      }
    });

    app.get('/agendamentos', async (req, res) => {
      try {
        const db = await openDb();
        const { date, view } = req.query;
        let agendamentos;
        const hoje = new Date().toISOString().split('T')[0];
        if (date) {
          agendamentos = await db.all(
            'SELECT * FROM agendamentos WHERE ? BETWEEN startDate AND endDate ORDER BY startDate ASC, startTime ASC',
            [date]
          );
        } else if (view === 'past') {
          agendamentos = await db.all(
            'SELECT * FROM agendamentos WHERE endDate < ? ORDER BY startDate DESC, startTime DESC',
            [hoje]
          );
        } else {
          agendamentos = await db.all(
            'SELECT * FROM agendamentos WHERE endDate >= ? ORDER BY startDate ASC, startTime ASC',
            [hoje]
          );
        }
        res.json(agendamentos);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar agendamentos.' });
      }
    });

    app.get('/minhas-tarefas', async (req, res) => {
      try {
        const db = await openDb();
        const { internName } = req.query;
        if (!internName) {
          return res
            .status(400)
            .json({ message: 'Nome do estagiário é obrigatório.' });
        }
        const hoje = new Date().toISOString().split('T')[0];
        const searchTerm = `%"${internName}"%`;
        const agendamentos = await db.all(
          `SELECT * FROM agendamentos WHERE endDate >= ? AND responsible_interns LIKE ? ORDER BY startDate ASC, startTime ASC`,
          [hoje, searchTerm]
        );
        res.json(agendamentos);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar tarefas.' });
      }
    });

    app.get('/agendamentos/:id', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        const agendamento = await db.get(
          'SELECT * FROM agendamentos WHERE id = ?',
          [id]
        );
        if (agendamento) {
          res.json(agendamento);
        } else {
          res.status(404).json({ message: 'Agendamento não encontrado.' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar agendamento.' });
      }
    });

    app.put('/agendamentos/:id', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        const {
          title,
          startDate,
          endDate,
          startTime,
          endTime,
          location,
          equipments,
          presence,
          notes,
        } = req.body;
        await db.run(
          `UPDATE agendamentos SET title = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?, location = ?, equipments = ?, presence = ?, notes = ? WHERE id = ?`,
          [
            title,
            startDate,
            endDate,
            startTime,
            endTime,
            location,
            JSON.stringify(equipments),
            presence,
            notes,
            id,
          ]
        );
        res.json({ message: 'Agendamento atualizado com sucesso!' });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar agendamento.' });
      }
    });

    app.put('/agendamentos/:id/prioritize', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        const agendamento = await db.get(
          'SELECT is_prioritized FROM agendamentos WHERE id = ?',
          [id]
        );
        if (agendamento) {
          const novoStatus = agendamento.is_prioritized === 0 ? 1 : 0;
          await db.run(
            'UPDATE agendamentos SET is_prioritized = ? WHERE id = ?',
            [novoStatus, id]
          );
          res.json({ message: 'Prioridade atualizada com sucesso!' });
        } else {
          res.status(404).json({ message: 'Agendamento não encontrado.' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Erro ao priorizar.' });
      }
    });

    app.put('/agendamentos/:id/assign', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        const { internName, supervisorName } = req.body;
        const agendamento = await db.get(
          'SELECT title, responsible_interns FROM agendamentos WHERE id = ?',
          [id]
        );
        if (agendamento && internName) {
          let interns = JSON.parse(agendamento.responsible_interns);
    D     let message = '';
          if (interns.includes(internName)) {
            interns = interns.filter((name) => name !== internName);
            if (supervisorName) {
              message = `O supervisor ${supervisorName} removeu você da tarefa "${agendamento.title}".`;
            }
          } else {
            interns.push(internName);
            if (supervisorName) {
              message = `O supervisor ${supervisorName} designou você para a tarefa "${agendamento.title}".`;
            }
          }
          if (message) {
            await db.run(
              'INSERT INTO notifications (intern_name, message) VALUES (?, ?)',
              [internName, message]
            );
          }
          await db.run(
            'UPDATE agendamentos SET responsible_interns = ? WHERE id = ?',
            [JSON.stringify(interns), id]
          );
          res.json({
            message: 'Status de candidatura atualizado com sucesso!',
          });
        } else {
          res
            .status(404)
            .json({
              message: 'Agendamento ou nome do estagiário não fornecido.',
            });
        }
      } catch (error) {
        res.status(500).json({ message: 'Erro ao gerenciar candidatura.' });
      }
    });

    app.delete('/agendamentos/:id', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        await db.run('DELETE FROM agendamentos WHERE id = ?', [id]);
        res.json({ message: 'Agendamento excluído com sucesso!' });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir agendamento.' });
      }
    });

    app.get('/notifications', async (req, res) => {
      const db = await openDb();
      const { internName } = req.query;
      if (!internName) {
        return res
          .status(400)
          .json({ message: 'Nome do estagiário é obrigatório.' });
      }
      const notifications = await db.all(
        'SELECT * FROM notifications WHERE intern_name = ? AND is_read = 0 ORDER BY timestamp DESC',
        [internName]
      );
      res.json(notifications);
    });

    app.put('/notifications/:id/read', async (req, res) => {
      const db = await openDb();
      const { id } = req.params;
      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      res.json({ message: 'Notificação marcada como lida.' });
    });

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('ERRO CRÍTICO AO INICIAR O SERVIDOR:', error);
  }
}

startServer();