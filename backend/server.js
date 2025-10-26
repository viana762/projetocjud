const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { openDb, setup } = require('./database.js');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const EMAIL_FIXO_DESTINO = 'vianagemini99@gmail.com';

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
  {
    name: 'TESTE GESTOR',
    email: 'testegestor@tjrs.jus.br',
    password: 'cjud@321',
    role: 'GESTOR_DE_CURSO',
  },
];

async function seedUsersIfNeeded() {
  const db = await openDb();

  const firstUser = await db.get('SELECT id FROM users LIMIT 1');

  if (!firstUser) {
    await db.run('DELETE FROM users');
    for (const user of usersToCreate) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [user.name, user.email, hashedPassword, user.role]
      );
    }
  }
}

async function cleanOldGestorNotifications() {
  const db = await openDb();
  const fortyEightHoursAgo = new Date(
    Date.now() - 48 * 60 * 60 * 1000
  ).toISOString();
  await db.run('DELETE FROM gestor_notifications WHERE created_at < ?', [
    fortyEightHoursAgo,
  ]);
}

async function createGestorNotification(
  gestorEmail,
  agendamentoId,
  message,
  type
) {
  const db = await openDb();
  await db.run(
    'INSERT INTO gestor_notifications (gestor_email, agendamento_id, message, type) VALUES (?, ?, ?, ?)',
    [gestorEmail, agendamentoId, message, type]
  );
}

async function startServer() {
  try {
    await setup();
    await seedUsersIfNeeded();

    setInterval(cleanOldGestorNotifications, 60 * 60 * 1000);

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
          hashedNewPassword,
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

    app.delete('/users/:email', async (req, res) => {
      try {
        const db = await openDb();
        const emailToDelete = req.params.email;

        const result = await db.run('DELETE FROM users WHERE email = ?', [
          emailToDelete,
        ]);

        if (result.changes === 0) {
          return res
            .status(404)
            .json({ message: 'Usuário não encontrado ou já excluído.' });
        }

        res.json({
          message: `Usuário com email ${emailToDelete} excluído com sucesso!`,
        });
      } catch (error) {
        console.error('ERRO AO EXCLUIR USUÁRIO:', error);
        res.status(500).json({ message: 'Erro interno ao excluir o usuário.' });
      }
    });

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
          grupo_evento,
        } = req.body;
        const db = await openDb();
        const result = await db.run(
          'INSERT INTO agendamentos (title, startDate, endDate, startTime, endTime, location, equipments, presence, notes, is_prioritized, responsible_interns, equipments_checked, grupo_evento, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
            '[]',
            grupo_evento || null,
            schedulerEmail,
          ]
        );
        const novoId = result.lastID;

        const user = await db.get('SELECT role FROM users WHERE email = ?', [
          schedulerEmail,
        ]);
        if (user && user.role === 'GESTOR_DE_CURSO') {
          await createGestorNotification(
            schedulerEmail,
            novoId,
            `Seu agendamento "${title}" foi criado com sucesso!`,
            'created'
          );
        }

        res.status(201).json({ message: 'Agendamento criado com sucesso!' });

        try {
          const mailOptions = {
            from: `"Sistema CJUD" <${process.env.EMAIL_USER}>`,
            to: EMAIL_FIXO_DESTINO,
            cc: schedulerEmail,
            subject: `Confirmação de Agendamento: ${title}`,
            html: `<h3>Agendamento Criado com Sucesso! (ID: ${novoId})</h3><p>O agendamento a seguir foi criado por ${schedulerEmail}:</p><ul><li><strong>Título:</strong> ${title}</li><li><strong>Grupo do Evento:</strong> ${
              grupo_evento || 'N/A'
            }</li><li><strong>Período:</strong> ${startDate} ${startTime} a ${endDate} ${endTime}</li><li><strong>Local:</strong> ${location}</li><li><strong>Equipamentos Solicitados:</strong> ${
              equipments.join(', ') || 'Nenhum'
            }</li><li><strong>Observações:</strong> ${
              notes || 'Nenhuma'
            }</li></ul><p>Acesse o painel para mais detalhes.</p>`,
          };
          await transporter.sendMail(mailOptions);
        } catch (emailError) {
          console.error(
            'ERRO GRAVE AO ENVIAR E-MAIL (AGENDAMENTO ID:',
            novoId,
            '):',
            emailError
          );
        }
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
        const { equipmentsChecked, internName, equipmentName } = req.body;

        const agendamento = await db.get(
          'SELECT title, created_by FROM agendamentos WHERE id = ?',
          [id]
        );

        await db.run(
          'UPDATE agendamentos SET equipments_checked = ? WHERE id = ?',
          [JSON.stringify(equipmentsChecked), id]
        );

        if (
          agendamento &&
          agendamento.created_by &&
          internName &&
          equipmentName
        ) {
          const user = await db.get('SELECT role FROM users WHERE email = ?', [
            agendamento.created_by,
          ]);
          if (user && user.role === 'GESTOR_DE_CURSO') {
            const action = equipmentsChecked.includes(equipmentName)
              ? 'marcou'
              : 'desmarcou';
            await createGestorNotification(
              agendamento.created_by,
              id,
              `${internName} ${action} o equipamento "${equipmentName}" no agendamento "${agendamento.title}"`,
              'equipment_check'
            );
          }
        }

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
          grupo_evento,
          editorEmail,
          editorRole,
        } = req.body;

        const agendamento = await db.get(
          'SELECT title, created_by, responsible_interns FROM agendamentos WHERE id = ?',
          [id]
        );

        await db.run(
          `UPDATE agendamentos SET title = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?, location = ?, equipments = ?, presence = ?, notes = ?, grupo_evento = ? WHERE id = ?`,
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
            grupo_evento || null,
            id,
          ]
        );

        if (agendamento && editorEmail) {
          const interns = JSON.parse(agendamento.responsible_interns || '[]');

          if (editorRole === 'GESTOR_DE_CURSO') {
            for (const internName of interns) {
              await db.run(
                'INSERT INTO notifications (intern_name, message) VALUES (?, ?)',
                [
                  internName,
                  `O agendamento "${agendamento.title}" foi editado pelo gestor.`,
                ]
              );
            }
          } else if (editorRole === 'SUPERVISOR' && agendamento.created_by) {
            const creator = await db.get(
              'SELECT role FROM users WHERE email = ?',
              [agendamento.created_by]
            );
            if (creator && creator.role === 'GESTOR_DE_CURSO') {
              await createGestorNotification(
                agendamento.created_by,
                id,
                `Seu agendamento "${agendamento.title}" foi editado por um supervisor.`,
                'edited'
              );
            }

            for (const internName of interns) {
              await db.run(
                'INSERT INTO notifications (intern_name, message) VALUES (?, ?)',
                [
                  internName,
                  `O agendamento "${agendamento.title}" foi editado.`,
                ]
              );
            }
          }
        }

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
          'SELECT is_prioritized, title, created_by FROM agendamentos WHERE id = ?',
          [id]
        );
        if (agendamento) {
          const novoStatus = agendamento.is_prioritized === 0 ? 1 : 0;
          await db.run(
            'UPDATE agendamentos SET is_prioritized = ? WHERE id = ?',
            [novoStatus, id]
          );

          if (novoStatus === 1 && agendamento.created_by) {
            const user = await db.get(
              'SELECT role FROM users WHERE email = ?',
              [agendamento.created_by]
            );
            if (user && user.role === 'GESTOR_DE_CURSO') {
              await createGestorNotification(
                agendamento.created_by,
                id,
                `Seu agendamento "${agendamento.title}" foi marcado como prioritário!`,
                'prioritized'
              );
            }
          }

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
          'SELECT title, responsible_interns, created_by FROM agendamentos WHERE id = ?',
          [id]
        );
        if (agendamento && internName) {
          let interns = JSON.parse(agendamento.responsible_interns);
          let message = '';
          let gestorMessage = '';

          if (interns.includes(internName)) {
            interns = interns.filter((name) => name !== internName);
            if (supervisorName) {
              message = `O supervisor ${supervisorName} removeu você da tarefa "${agendamento.title}".`;
              gestorMessage = `O estagiário ${internName} foi removido do agendamento "${agendamento.title}" pelo supervisor ${supervisorName}.`;
            }
          } else {
            interns.push(internName);
            if (supervisorName) {
              message = `O supervisor ${supervisorName} designou você para a tarefa "${agendamento.title}".`;
              gestorMessage = `O estagiário ${internName} foi designado para seu agendamento "${agendamento.title}".`;
            }
          }

          if (message) {
            await db.run(
              'INSERT INTO notifications (intern_name, message) VALUES (?, ?)',
              [internName, message]
            );
          }

          if (gestorMessage && agendamento.created_by && supervisorName) {
            const creator = await db.get(
              'SELECT role FROM users WHERE email = ?',
              [agendamento.created_by]
            );
            if (creator && creator.role === 'GESTOR_DE_CURSO') {
              await createGestorNotification(
                agendamento.created_by,
                id,
                gestorMessage,
                'intern_assigned'
              );
            }
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
        const { deleterEmail } = req.query;

        const agendamento = await db.get(
          'SELECT title, created_by, responsible_interns FROM agendamentos WHERE id = ?',
          [id]
        );

        if (agendamento) {
          const interns = JSON.parse(agendamento.responsible_interns || '[]');

          for (const internName of interns) {
            await db.run(
              'INSERT INTO notifications (intern_name, message) VALUES (?, ?)',
              [internName, `O agendamento "${agendamento.title}" foi excluído.`]
            );
          }

          if (
            agendamento.created_by &&
            deleterEmail &&
            agendamento.created_by !== deleterEmail
          ) {
            const creator = await db.get(
              'SELECT role FROM users WHERE email = ?',
              [agendamento.created_by]
            );
            if (creator && creator.role === 'GESTOR_DE_CURSO') {
              await createGestorNotification(
                agendamento.created_by,
                id,
                `Seu agendamento "${agendamento.title}" foi excluído.`,
                'deleted'
              );
            }
          }
        }

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

    app.get('/gestor-notifications', async (req, res) => {
      try {
        const db = await openDb();
        const { gestorEmail } = req.query;
        if (!gestorEmail) {
          return res
            .status(400)
            .json({ message: 'Email do gestor é obrigatório.' });
        }
        await cleanOldGestorNotifications();
        const notifications = await db.all(
          'SELECT * FROM gestor_notifications WHERE gestor_email = ? AND is_read = 0 ORDER BY created_at DESC',
          [gestorEmail]
        );
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notificações.' });
      }
    });

    app.put('/gestor-notifications/:id/read', async (req, res) => {
      try {
        const db = await openDb();
        const { id } = req.params;
        await db.run(
          'UPDATE gestor_notifications SET is_read = 1 WHERE id = ?',
          [id]
        );
        res.json({ message: 'Notificação marcada como lida.' });
      } catch (error) {
        res
          .status(500)
          .json({ message: 'Erro ao marcar notificação como lida.' });
      }
    });

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('ERRO CRÍTICO AO INICIAR O SERVIDOR:', error);
  }
}

startServer();
