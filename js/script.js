document.addEventListener("DOMContentLoaded", function() {
    // ====================================================================
    // CONFIGURAÇÕES, SELETORES E VARIÁVEIS GERAIS
    // ====================================================================
    // ATENÇÃO: COLOQUE AQUI A URL QUE VOCÊ GEROU NO PASSO 1 DO APPS SCRIPT
    const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbyf3csqhMdP2uwUa0JXNZ0zdCWji4W3UOngOK26DSWxf0OlNzyMxEwBJdDhuwZN06DXig/exec";

    const masterInputs = document.querySelectorAll('.master-input');
    const masterCheckboxes = document.querySelectorAll('.master-checkbox');
    const btnAddExame = document.getElementById('btn-add-exame');
    const inputExameExtra = document.getElementById('input-exame-extra');
    const listaExtrasPainel = document.getElementById('lista-extras-painel');
    const btnSalvarImprimir = document.getElementById('btn-salvar-imprimir');
    const msgStatus = document.getElementById('msg-status');

    // ====================================================================
    // 1. ESPELHAMENTO DE TEXTO E DATAS
    // ====================================================================
    masterInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const campoNome = e.target.name; 
            let valorDigitado = e.target.value;

            if (e.target.type === 'date' && valorDigitado) {
                const partes = valorDigitado.split('-');
                if (partes.length === 3) {
                    valorDigitado = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
            }

            const elementosDestino = document.querySelectorAll(`.out-${campoNome}`);
            elementosDestino.forEach(span => {
                span.textContent = valorDigitado;
            });
        });
    });

    // ====================================================================
    // 2. LÓGICA DE EXIBIÇÃO DINÂMICA DE EXAMES
    // ====================================================================
    function atualizarListaExames() {
        const examesClinicos = [];
        const examesRaioX = [];
        const examesLab = [];

        document.querySelectorAll('.master-checkbox:checked').forEach(cb => {
            const setor = cb.getAttribute('data-setor');
            const nomeExame = cb.getAttribute('data-nome');
            
            if (setor === 'clinico') examesClinicos.push(nomeExame);
            if (setor === 'raiox') examesRaioX.push(nomeExame);
            if (setor === 'lab') examesLab.push(nomeExame);
        });

        function renderizarLista(idElemento, arrayExames) {
            const ul = document.getElementById(idElemento);
            if (!ul) return;
            
            if (arrayExames.length === 0) {
                ul.innerHTML = '<li class="vazio">Nenhum exame selecionado</li>';
            } else {
                ul.innerHTML = arrayExames.map(exame => `<li>${exame}</li>`).join('');
            }
        }

        renderizarLista('lista-clinico', examesClinicos);
        renderizarLista('lista-raiox', examesRaioX);
        renderizarLista('lista-lab', examesLab);
    }

    // Atrela o evento de mudança aos checkboxes nativos
    masterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', atualizarListaExames);
    });

    // ====================================================================
    // 3. INSERÇÃO DE EXAMES EXTRAS NO LABORATÓRIO
    // ====================================================================
    function adicionarExameExtra() {
        const nomeExame = inputExameExtra.value.trim();
        
        if (nomeExame !== '') {
            const novoLabel = document.createElement('label');
            novoLabel.style.display = 'block';
            novoLabel.style.color = '#d9534f'; 
            
            const novoCheckbox = document.createElement('input');
            novoCheckbox.type = 'checkbox';
            novoCheckbox.className = 'master-checkbox';
            novoCheckbox.setAttribute('data-setor', 'lab');
            novoCheckbox.setAttribute('data-nome', nomeExame);
            novoCheckbox.checked = true; 
            
            novoCheckbox.addEventListener('change', atualizarListaExames);
            
            novoLabel.appendChild(novoCheckbox);
            novoLabel.appendChild(document.createTextNode(' ' + nomeExame));
            listaExtrasPainel.appendChild(novoLabel);
            
            inputExameExtra.value = '';
            atualizarListaExames();
        }
    }

    if (btnAddExame) {
        btnAddExame.addEventListener('click', adicionarExameExtra);
    }
    
    if (inputExameExtra) {
        inputExameExtra.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                adicionarExameExtra();
            }
        });
    }

    // ====================================================================
    // 4. INTEGRAÇÃO COM O GOOGLE PLANILHAS E IMPRESSÃO
    // ====================================================================
    if (btnSalvarImprimir) {
        btnSalvarImprimir.addEventListener('click', function() {
            btnSalvarImprimir.disabled = true;
            btnSalvarImprimir.style.opacity = "0.5";
            msgStatus.style.display = "block";
            msgStatus.style.color = "#004080";
            msgStatus.textContent = "Salvando dados de " + document.querySelector('[name="nome"]').value + " no sistema...";

            const dadosParaPlanilha = {
                empresa: document.querySelector('[name="empresa"]').value,
                nome: document.querySelector('[name="nome"]').value,
                funcao: document.querySelector('[name="funcao"]').value,
                dn: document.querySelector('[name="dn"]').value,
                rg: document.querySelector('[name="rg"]').value,
                cpf: document.querySelector('[name="cpf"]').value,
                peso: document.querySelector('[name="peso"]').value,
                altura: document.querySelector('[name="altura"]').value,
                dataExame: document.querySelector('[name="data"]').value,
                
                examesClinicos: pegarExamesSelecionadosPorSetor('clinico'),
                examesRaioX: pegarExamesSelecionadosPorSetor('raiox'),
                examesLab: pegarExamesSelecionadosPorSetor('lab')
            };

            fetch(URL_GOOGLE_SCRIPT, {
                method: 'POST',
                mode: 'no-cors', 
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(dadosParaPlanilha)
            })
            .then(response => {
                msgStatus.textContent = "✅ Dados salvos com sucesso! Abrindo impressão...";
                msgStatus.style.color = "green";
                
                setTimeout(() => {
                    msgStatus.style.display = "none";
                    btnSalvarImprimir.disabled = false;
                    btnSalvarImprimir.style.opacity = "1";
                    
                    window.print();
                }, 1500);
            })
            .catch(error => {
                console.error('Erro ao salvar na planilha:', error);
                msgStatus.textContent = "❌ Erro de conexão ao salvar na planilha. Tente novamente.";
                msgStatus.style.color = "red";
                btnSalvarImprimir.disabled = false;
                btnSalvarImprimir.style.opacity = "1";
            });
        });
    }

    function pegarExamesSelecionadosPorSetor(setor) {
        let exames = [];
        document.querySelectorAll(`.master-checkbox[data-setor="${setor}"]:checked`).forEach(cb => {
            exames.push(cb.getAttribute('data-nome'));
        });
        return exames.length > 0 ? exames.join(', ') : 'Nenhum';
    }

    // ====================================================================
    // 5. MODO COMPACTO DE EMERGÊNCIA
    // ====================================================================
    window.addEventListener('beforeprint', function() {
        const totalExamesSelecionados = document.querySelectorAll('.master-checkbox:checked').length;
        if (totalExamesSelecionados > 10) {
            document.body.classList.add('print-compacto');
        } else {
            document.body.classList.remove('print-compacto');
        }
    });

    window.addEventListener('afterprint', function() {
        document.body.classList.remove('print-compacto');
    });
});