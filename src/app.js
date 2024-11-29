const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');  // Para fazer o hash da senha

const app = express();
const db = new sqlite3.Database('./database.db');

// Middleware para permitir requisições CORS (útil para desenvolvimento)
app.use(cors());
app.use(express.json());  // Para lidar com JSON no corpo da requisição

// Middleware para servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static('public'));  // Certifique-se de que a pasta 'public' contém seus arquivos HTML

// Criação das tabelas caso não existam
db.serialize(() => {
    // Criar tabela de funcionários
    db.run(`CREATE TABLE IF NOT EXISTS funcionario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    // Criar tabela de clientes
    db.run(`CREATE TABLE IF NOT EXISTS cliente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);
});

// Rota para criar conta
app.post('/create-account', (req, res) => {
    const { name, cpf, phone, email, password, userType } = req.body;
    const table = userType === 'funcionario' ? 'funcionario' : 'cliente';

    // Criptografar a senha antes de salvar
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao criptografar senha' });
        }

        const stmt = db.prepare(`INSERT INTO ${table} (name, cpf, phone, email, password) VALUES (?, ?, ?, ?, ?)`);
        stmt.run(name, cpf, phone, email, hashedPassword, function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro ao criar conta' });
            }
            res.json({ success: true, message: 'Conta criada com sucesso' });
        });
    });
});

// Rota de login
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
                            return res.json({ success: true, userType: 'cliente' });
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