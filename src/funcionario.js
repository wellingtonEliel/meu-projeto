document.getElementById("ordemForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Captura os dados do formulário
    const ordem = {
        descricao: document.getElementById("descricao").value,
        status: document.getElementById("status").value,
        equipamentos: document.getElementById("equipamentos").value,
        descricao_problema: document.getElementById("descricaoProblema").value || null,
        descricao_servico: document.getElementById("descricaoServico").value || null,
        valor_total: parseFloat(document.getElementById("valorTotal").value) || null,
        funcionario_id: parseInt(document.getElementById("funcionarioId").value, 10),
        cliente_id: parseInt(document.getElementById("clienteId").value, 10),
    };

    console.log("Dados a serem enviados:", ordem);

    try {
        const response = await fetch("/criar-ordem", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ordem),
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Ordem criada com sucesso! ID: ${result.id}`);
            document.getElementById("ordemForm").reset(); // Limpa o formulário
        } else {
            const error = await response.json();
            alert(`Erro ao criar ordem: ${error.message}`);
        }
    } catch (error) {
        console.error("Erro ao enviar os dados:", error);
        alert("Falha ao conectar com o servidor.");
    }
});
