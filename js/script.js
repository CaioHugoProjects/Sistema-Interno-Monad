document.addEventListener("DOMContentLoaded", function() {
    // ====================================================================
    // CONFIGURAÇÕES, SELETORES E VARIÁVEIS GERAIS
    // ====================================================================
    // ATENÇÃO: COLOQUE AQUI A URL QUE VOCÊ GEROU DO APPS SCRIPT
    const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbyf3csqhMdP2uwUa0JXNZ0zdCWji4W3UOngOK26DSWxf0OlNzyMxEwBJdDhuwZN06DXig/exec";

    const masterInputs = document.querySelectorAll('.master-input');
    const masterCheckboxes = document.querySelectorAll('.master-checkbox');
    const btnSalvarImprimir = document.getElementById('btn-salvar-imprimir');
    const msgStatus = document.getElementById('msg-status');

    // ====================================================================
    // 0. MÁSCARAS E VALIDAÇÃO DE CPF E TELEFONE
    // ====================================================================
    const cpfInput = document.querySelector('input[name="cpf"]');
    const telefoneInput = document.querySelector('input[name="telefone"]');
    const cpfError = document.getElementById('cpf-error');

    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); 
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 9) {
                v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            } else if (v.length > 6) {
                v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
            } else if (v.length > 3) {
                v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            }
            e.target.value = v;
            
            cpfError.style.display = 'none';
            cpfInput.style.borderColor = '#ccc';
            cpfInput.dispatchEvent(new Event('input', { bubbles: true }));
        });

        cpfInput.addEventListener('blur', function() {
            if (this.value && !validarCPF(this.value)) {
                cpfError.style.display = 'block';
                this.style.borderColor = 'red';
            }
        });
    }

    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 10) {
                v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
            } else if (v.length > 5) {
                v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
            } else if (v.length > 2) {
                v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
            } else if (v.length > 0) {
                v = v.replace(/^(\d*)/, "($1");
            }
            e.target.value = v;
            
            telefoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g,'');
        if(cpf == '') return false;
        if (cpf.length != 11 ||
            cpf == "00000000000" || cpf == "11111111111" || cpf == "22222222222" ||
            cpf == "33333333333" || cpf == "44444444444" || cpf == "55555555555" ||
            cpf == "66666666666" || cpf == "77777777777" || cpf == "88888888888" ||
            cpf == "99999999999") return false;
        
        let add = 0;
        for (let i=0; i < 9; i ++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev == 10 || rev == 11) rev = 0;
        if (rev != parseInt(cpf.charAt(9))) return false;
        
        add = 0;
        for (let i = 0; i < 10; i ++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11) rev = 0;
        if (rev != parseInt(cpf.charAt(10))) return false;
        
        return true;
    }

    // ====================================================================
    // 1. ESPELHAMENTO DE TEXTO E DATAS
    // ====================================================================
    masterInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            if ((e.target.name === 'cpf' || e.target.name === 'telefone') && document.activeElement === e.target && e.isTrusted) return;
            
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

        input.addEventListener('blur', function(e) {
            const campoNome = e.target.name; 
            let valorDigitado = e.target.value;
            const elementosDestino = document.querySelectorAll(`.out-${campoNome}`);
            elementosDestino.forEach(span => {
                span.textContent = valorDigitado;
            });
        });
    });

    // ====================================================================
    // 1.5 ESPELHAMENTO DO TIPO DE EXAME (COM PARÊNTESES)
    // ====================================================================
    const masterTipos = document.querySelectorAll('.master-tipo');
    
    function atualizarTipoExame() {
        const tiposSelecionados = [];
        document.querySelectorAll('.master-tipo:checked').forEach(cb => {
            tiposSelecionados.push(cb.value);
        });

        const textoParaExibir = tiposSelecionados.length > 0 ? `(${tiposSelecionados.join(' / ')})` : '';

        document.querySelectorAll('.out-tipo-exame').forEach(span => {
            span.textContent = textoParaExibir;
        });
    }

    masterTipos.forEach(checkbox => {
        checkbox.addEventListener('change', atualizarTipoExame);
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

    masterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', atualizarListaExames);
    });

    // ====================================================================
    // 3. INSERÇÃO DE EXAMES EXTRAS (LABORATÓRIO E RAIO-X)
    // ====================================================================
    const btnAddExameLab = document.getElementById('btn-add-exame');
    const inputExameExtraLab = document.getElementById('input-exame-extra');
    const listaExtrasPainelLab = document.getElementById('lista-extras-painel');

    const btnAddExameRaiox = document.getElementById('btn-add-exame-raiox');
    const inputExameExtraRaiox = document.getElementById('input-exame-extra-raiox');
    const listaExtrasPainelRaiox = document.getElementById('lista-extras-painel-raiox');

    function adicionarExameExtra(inputElement, painelElement, setor) {
        const nomeExame = inputElement.value.trim();
        
        if (nomeExame !== '') {
            const novoLabel = document.createElement('label');
            novoLabel.style.display = 'block';
            novoLabel.style.color = '#d9534f'; 
            
            const novoCheckbox = document.createElement('input');
            novoCheckbox.type = 'checkbox';
            novoCheckbox.className = 'master-checkbox';
            novoCheckbox.setAttribute('data-setor', setor);
            novoCheckbox.setAttribute('data-nome', nomeExame);
            novoCheckbox.checked = true; 
            
            novoCheckbox.addEventListener('change', atualizarListaExames);
            
            novoLabel.appendChild(novoCheckbox);
            novoLabel.appendChild(document.createTextNode(' ' + nomeExame));
            painelElement.appendChild(novoLabel);
            
            inputElement.value = '';
            atualizarListaExames();
        }
    }

    if (btnAddExameLab) btnAddExameLab.addEventListener('click', () => adicionarExameExtra(inputExameExtraLab, listaExtrasPainelLab, 'lab'));
    if (inputExameExtraLab) inputExameExtraLab.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); adicionarExameExtra(inputExameExtraLab, listaExtrasPainelLab, 'lab'); } });

    if (btnAddExameRaiox) btnAddExameRaiox.addEventListener('click', () => adicionarExameExtra(inputExameExtraRaiox, listaExtrasPainelRaiox, 'raiox'));
    if (inputExameExtraRaiox) inputExameExtraRaiox.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); adicionarExameExtra(inputExameExtraRaiox, listaExtrasPainelRaiox, 'raiox'); } });

    // ====================================================================
    // 6. CONTROLE DA FICHA DE AUDIOMETRIA (FONOAUDIOLOGIA)
    // ====================================================================
    const checkAudiometria = document.getElementById('check-audiometria');
    const setorAudio = document.getElementById('setor-audio');

    if (checkAudiometria && setorAudio) {
        function toggleAudiometria() {
            setorAudio.style.display = checkAudiometria.checked ? 'flex' : 'none';
        }
        checkAudiometria.addEventListener('change', toggleAudiometria);
        toggleAudiometria(); 
    }

    // ====================================================================
    // 4. INTEGRAÇÃO COM O GOOGLE PLANILHAS E IMPRESSÃO
    // ====================================================================
    function pegarExamesSelecionadosPorSetor(setor) {
        let exames = [];
        document.querySelectorAll(`.master-checkbox[data-setor="${setor}"]:checked`).forEach(cb => {
            exames.push(cb.getAttribute('data-nome'));
        });
        return exames.length > 0 ? exames.join(', ') : 'Nenhum';
    }

    if (btnSalvarImprimir) {
        btnSalvarImprimir.addEventListener('click', function() {
            const cpfAtual = cpfInput ? cpfInput.value : '';
            if (cpfAtual && !validarCPF(cpfAtual)) {
                alert("O CPF informado é inválido. Por favor, corrija antes de prosseguir.");
                cpfInput.focus();
                return;
            }

            btnSalvarImprimir.disabled = true;
            btnSalvarImprimir.style.opacity = "0.5";
            msgStatus.style.display = "block";
            msgStatus.style.color = "#004080";
            msgStatus.textContent = "Salvando dados de " + document.querySelector('[name="nome"]').value + " no sistema...";

            // AGORA COM A AUDIOMETRIA ENVIANDO TRUE/FALSE NATIVO
            const dadosParaPlanilha = {
                empresa: document.querySelector('[name="empresa"]').value,
                nome: document.querySelector('[name="nome"]').value,
                funcao: document.querySelector('[name="funcao"]').value,
                dn: document.querySelector('[name="dn"]').value,
                rg: document.querySelector('[name="rg"]').value,
                cpf: document.querySelector('[name="cpf"]').value,
                telefone: document.querySelector('[name="telefone"]').value,
                peso: "", 
                altura: "", 
                dataExame: document.querySelector('[name="data"]').value,
                examesClinicos: pegarExamesSelecionadosPorSetor('clinico'),
                examesRaioX: pegarExamesSelecionadosPorSetor('raiox'),
                examesLab: pegarExamesSelecionadosPorSetor('lab'),
                
                // Manda 'true' se marcado, e 'false' se desmarcado
                audiometria: checkAudiometria ? checkAudiometria.checked : false
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