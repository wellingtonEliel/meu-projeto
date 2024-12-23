// src/db.js
const sqlite3 = require('sqlite3').verbose();

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database('database/database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
    } else {
        console.log('Conexão com o banco de dados estabelecida.');
        // Criação das tabelas caso não existam
        db.run(`
            CREATE TABLE IF NOT EXISTS funcionario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cpf TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            );
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS cliente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cpf TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            );
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
    }
});

module.exports = { db };