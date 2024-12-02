const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const db = new sqlite3.Database('database/database.db');

const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Criação das tabelas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS funcionario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS cliente (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ordem_servico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT NOT NULL,
            status TEXT NOT NULL,
            funcionario_cpf TEXT NOT NULL,
            cliente_cpf TEXT NOT NULL,
            equipamentos TEXT NOT NULL,
            descricao_problema TEXT NOT NULL,
            descricao_servico TEXT NOT NULL,
            valor_total TEXT NOT NULL,
            FOREIGN KEY(funcionario_cpf) REFERENCES funcionario(cpf),
            FOREIGN KEY(cliente_cpf) REFERENCES cliente(cpf)
        )
    `);
});

// Rota para criar uma nova ordem de serviço
app.post('/create-order', (req, res) => {
    const { descricao, status, funcionario_cpf, cliente_cpf, equipamentos, descricao_problema, descricao_servico, valor_total } = req.body;

    // Verifique se todos os campos necessários foram recebidos
    if (!descricao || !status || !funcionario_cpf || !cliente_cpf) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
    }

    // Prepare a SQL para inserir todos os campos, incluindo os novos
    const stmt = db.prepare(`
        INSERT INTO ordem_servico (descricao, status, funcionario_cpf, cliente_cpf, equipamentos, descricao_problema, descricao_servico, valor_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(descricao, status, funcionario_cpf, cliente_cpf, equipamentos, descricao_problema, descricao_servico, valor_total, function (err) {
        if (err) {
            console.error('Erro ao criar ordem:', err);
            return res.status(500).json({ success: false, message: 'Erro ao criar ordem de serviço' });
        }
        res.json({ success: true, message: 'Ordem criada com sucesso' });
    });
});

app.post('/create-account', (req, res) => {
    const { name, cpf, phone, email, password, userType } = req.body;

    // Validar userType
    if (userType !== 'cliente' && userType !== 'funcionario') {
        return res.status(400).json({ success: false, message: 'Tipo de usuário inválido' });
    }

    // Determinar a tabela com base no userType
    const table = userType === 'cliente' ? 'cliente' : 'funcionario';

    // Criptografar a senha
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Erro ao criptografar senha:', err);
            return res.status(500).json({ success: false, message: 'Erro ao criptografar senha' });
        }

        // Inserir na tabela correspondente
        const sql = `INSERT INTO ${table} (name, cpf, phone, email, password) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [name, cpf, phone, email, hashedPassword], function (err) {
            if (err) {
                console.error('Erro ao inserir dados:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'CPF ou E-mail já cadastrado' });
                }
                return res.status(500).json({ success: false, message: 'Erro ao criar conta' });
            }
            res.json({ success: true, message: `Conta criada com sucesso como ${userType}` });
        });
    });
});

// Rota para login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Verificar na tabela de funcionários
    db.get('SELECT * FROM funcionario WHERE email = ?', [email], (err, funcionario) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao consultar banco de dados' });
        }

        if (funcionario) {
            // Comparar a senha criptografada
            bcrypt.compare(password, funcionario.password, (err, result) => {
                if (result) {
                    // Retorna o tipo de usuário como 'funcionario', sem CPF, já que o funcionário não precisa do CPF
                    return res.json({ success: true, userType: 'funcionario' });
                } else {
                    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
                }
            });
        } else {
            // Se não encontrar na tabela de funcionários, verificar na tabela de clientes
            db.get('SELECT * FROM cliente WHERE email = ?', [email], (err, cliente) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Erro ao consultar banco de dados' });
                }

                if (cliente) {
                    // Comparar a senha criptografada
                    bcrypt.compare(password, cliente.password, (err, result) => {
                        if (result) {
                            // Retorna o tipo de usuário como 'cliente' e o CPF do cliente
                            return res.json({ success: true, userType: 'cliente', cpf: cliente.cpf });
                        } else {
                            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
                        }
                    });
                } else {
                    return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
                }
            });
        }
    });
});


// Rota para obter todos os funcionários e clientes
app.get('/get-accounts', (req, res) => {
    const data = { funcionarios: [], clientes: [] };

    // Consultar funcionários
    db.all('SELECT * FROM funcionario', (err, rows) => {
        if (err) {
            console.error('Erro ao consultar funcionários:', err);
            return res.status(500).json({ success: false, message: 'Erro ao obter funcionários' });
        }
        data.funcionarios = rows;

        // Consultar clientes
        db.all('SELECT * FROM cliente', (err, rows) => {
            if (err) {
                console.error('Erro ao consultar clientes:', err);
                return res.status(500).json({ success: false, message: 'Erro ao obter clientes' });
            }
            data.clientes = rows;
            return res.json({ success: true, data });
        });
    });
});

// Rota para obter todas as ordens de serviço com detalhes dos clientes e funcionários
app.get('/get-orders', (req, res) => {
    db.all(`
        SELECT os.id, os.descricao, os.status, os.equipamentos, os.descricao_problema, os.descricao_servico, os.valor_total,
               f.name AS funcionario_name, c.name AS cliente_name
        FROM ordem_servico os
        JOIN funcionario f ON os.funcionario_cpf = f.cpf
        JOIN cliente c ON os.cliente_cpf = c.cpf
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao obter ordens de serviço' });
        }
        res.json({ success: true, data: rows });
    });
});

// Rota para obter uma ordem de serviço por ID
app.get('/get-order/:id', (req, res) => {
    const orderId = req.params.id;
    db.get('SELECT * FROM ordem_servico WHERE id = ?', [orderId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Erro ao acessar o banco de dados" });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: "Ordem não encontrada" });
        }
        res.json({ success: true, data: row });
    });
});

app.use(express.json());

// Rota para atualizar uma ordem de serviço
app.put('/update-order-status/:id', (req, res) => {
    const orderId = req.params.id;
    const { descricao, status, funcionario_cpf, cliente_cpf, equipamentos, descricao_problema, descricao_servico, valor_total } = req.body;

    console.log('Dados recebidos:', req.body);  // Verificar os dados recebidos

    if (!descricao || !status || !funcionario_cpf || !cliente_cpf || !equipamentos || !valor_total) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
    }

    const stmt = db.prepare(`
        UPDATE ordem_servico
        SET descricao = ?, status = ?, funcionario_cpf = ?, cliente_cpf = ?, equipamentos = ?, descricao_problema = ?, descricao_servico = ?, valor_total = ?
        WHERE id = ?
    `);

    stmt.run(descricao, status, funcionario_cpf, cliente_cpf, equipamentos, descricao_problema, descricao_servico, valor_total, orderId, function (err) {
        if (err) {
            console.error('Erro ao atualizar ordem:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar ordem de serviço' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Ordem não encontrada' });
        }
        res.json({ success: true, message: 'Ordem de serviço atualizada com sucesso' });
    });
});


app.put('/update-order/:id', (req, res) => {
    const orderId = req.params.id;
    console.log(`Requisição PUT recebida para /update-order/${orderId}`); // Verifique se o ID está sendo passado corretamente
    const { status } = req.body;
    console.log('Status recebido:', status);

    if (!status) {
        return res.status(400).json({ success: false, message: 'Status é obrigatório' });
    }

    const stmt = db.prepare(`
        UPDATE ordem_servico
        SET status = ?
        WHERE id = ?
    `);

    stmt.run(status, orderId, function (err) {
        if (err) {
            console.error('Erro ao atualizar ordem:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar ordem de serviço' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Ordem não encontrada' });
        }
        res.json({ success: true, message: 'Ordem de serviço atualizada com sucesso' });
    });

    stmt.finalize(); // Fechar a instrução após a execução
});


// Rota para deletar uma ordem de serviço
app.delete('/delete-order/:id', (req, res) => {
    const orderId = req.params.id;
    db.run('DELETE FROM ordem_servico WHERE id = ?', [orderId], function (err) {
        if (err) {
            console.error('Erro ao deletar ordem:', err);
            return res.status(500).json({ success: false, message: 'Erro ao deletar ordem de serviço' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Ordem não encontrada' });
        }
        res.json({ success: true, message: 'Ordem de serviço deletada com sucesso' });
    });
});

app.use(express.json());


// Rota para buscar ordens de serviço por CPF
app.get('/get-orders-by-cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;

    db.all('SELECT * FROM ordem_servico WHERE cliente_cpf = ?', [cpf], (err, rows) => {
        if (err) {
            console.error("Erro ao acessar o banco de dados:", err);
            return res.status(500).json({ success: false, message: 'Erro ao acessar o banco de dados' });
        }

        if (rows.length > 0) {
            return res.json({ success: true, data: rows });
        } else {
            return res.json({ success: false, message: 'Nenhuma ordem de serviço encontrada para este CPF.' });
        }
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
