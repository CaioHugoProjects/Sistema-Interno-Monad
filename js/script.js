document.addEventListener("DOMContentLoaded", function() {
    const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbyf3csqhMdP2uwUa0JXNZ0zdCWji4W3UOngOK26DSWxf0OlNzyMxEwBJdDhuwZN06DXig/exec";

    // BLOQUEIO ESTRUTURAL: Impede a perda de dados por submissão acidental
    const masterForm = document.getElementById('masterForm');
    if (masterForm) {
        masterForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
        });
    }

    const masterInputs = document.querySelectorAll('.master-input');
    const masterCheckboxes = document.querySelectorAll('.master-checkbox');
    const btnSalvarImprimir = document.getElementById('btn-salvar-imprimir');
    const msgStatus = document.getElementById('msg-status');
    const cpfInput = document.querySelector('input[name="cpf"]');
    const telefoneInput = document.querySelector('input[name="telefone"]');
    const cpfError = document.getElementById('cpf-error');
    const inputData = document.querySelector('input[name="data"]');

    if (inputData) {
        const hoje = new Date().toISOString().split('T')[0];
        const dataSalva = localStorage.getItem('monad_data_recepcao');
        let dataFinal = dataSalva ? dataSalva : hoje;
        inputData.value = dataFinal;
        
        if (!dataSalva) localStorage.setItem('monad_data_recepcao', hoje);

        const partes = dataFinal.split('-');
        if (partes.length === 3) document.querySelectorAll('.out-data').forEach(span => span.textContent = `${partes[2]}/${partes[1]}/${partes[0]}`);

        inputData.addEventListener('change', function() {
            localStorage.setItem('monad_data_recepcao', this.value);
            const p = this.value.split('-');
            if (p.length === 3) document.querySelectorAll('.out-data').forEach(span => span.textContent = `${p[2]}/${p[1]}/${p[0]}`);
        });
    }

    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); 
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
            else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            e.target.value = v;
            cpfError.style.display = 'none';
            cpfInput.style.borderColor = 'var(--border)';
        });

        cpfInput.addEventListener('blur', function() {
            if (this.value && !validarCPF(this.value)) {
                cpfError.style.display = 'block';
                this.style.borderColor = 'var(--danger)';
            }
        });
    }

    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
            else if (v.length > 5) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
            else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
            else if (v.length > 0) v = v.replace(/^(\d*)/, "($1");
            e.target.value = v;
        });
    }

    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g,'');
        if(cpf == '') return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
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

    masterInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let valorDigitado = e.target.value;
            if (e.target.type === 'date' && valorDigitado) {
                const partes = valorDigitado.split('-');
                if (partes.length === 3) valorDigitado = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
            document.querySelectorAll(`.out-${e.target.name}`).forEach(span => span.textContent = valorDigitado);
        });
    });

    document.querySelectorAll('.master-tipo').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const tipos = Array.from(document.querySelectorAll('.master-tipo:checked')).map(cb => cb.value);
            const texto = tipos.length > 0 ? `(${tipos.join(' / ')})` : '';
            document.querySelectorAll('.out-tipo-exame').forEach(span => span.textContent = texto);
        });
    });

    function atualizarListaExames() {
        const exames = { clinico: [], raiox: [], lab: [] };
        document.querySelectorAll('.master-checkbox:checked').forEach(cb => {
            if (exames[cb.dataset.setor]) exames[cb.dataset.setor].push(cb.dataset.nome);
        });

        Object.keys(exames).forEach(setor => {
            const ul = document.getElementById(`lista-${setor}`);
            if (ul) ul.innerHTML = exames[setor].length === 0 ? '<li class="vazio">Nenhum exame selecionado</li>' : exames[setor].map(e => `<li>${e}</li>`).join('');
        });
    }
    
    document.body.addEventListener('change', function(e) {
        if (e.target.classList.contains('master-checkbox')) atualizarListaExames();
    });

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
            novoLabel.style.color = 'var(--danger)'; 
            
            const novoCheckbox = document.createElement('input');
            novoCheckbox.type = 'checkbox';
            novoCheckbox.className = 'master-checkbox';
            novoCheckbox.dataset.setor = setor;
            novoCheckbox.dataset.nome = nomeExame;
            novoCheckbox.checked = true; 
            
            novoLabel.appendChild(novoCheckbox);
            novoLabel.appendChild(document.createTextNode(' ' + nomeExame));
            painelElement.appendChild(novoLabel);
            
            inputElement.value = '';
            atualizarListaExames();
        }
    }

    if (btnAddExameLab) btnAddExameLab.addEventListener('click', () => adicionarExameExtra(inputExameExtraLab, listaExtrasPainelLab, 'lab'));
    if (btnAddExameRaiox) btnAddExameRaiox.addEventListener('click', () => adicionarExameExtra(inputExameExtraRaiox, listaExtrasPainelRaiox, 'raiox'));

    const checkAudio = document.getElementById('check-audiometria');
    const setorAudio = document.getElementById('setor-audio');
    if (checkAudio && setorAudio) {
        checkAudio.addEventListener('change', () => setorAudio.style.display = checkAudio.checked ? 'flex' : 'none');
        setorAudio.style.display = checkAudio.checked ? 'flex' : 'none';
    }

    if (btnSalvarImprimir) {
        btnSalvarImprimir.addEventListener('click', function() {
            if (btnSalvarImprimir.disabled) return;
            if (cpfInput.value && !validarCPF(cpfInput.value)) {
                alert("O CPF digitado é inválido. Por favor, corrija antes de gravar.");
                return cpfInput.focus();
            }

            const nome = document.querySelector('[name="nome"]').value.trim();
            const empresa = document.querySelector('[name="empresa"]').value.trim();
            const funcao = document.querySelector('[name="funcao"]').value.trim();
            const dn = document.querySelector('[name="dn"]').value.trim();
            const dataExame = document.querySelector('[name="data"]').value.trim();

            if (!nome || !empresa || !funcao || !dn || !dataExame) {
                alert("⚠️ AÇÃO BLOQUEADA:\nPor favor, preencha todos os campos obrigatórios.");
                return;
            }

            const tiposSelecionados = Array.from(document.querySelectorAll('.master-tipo:checked')).map(cb => cb.value);
            const tipoExame = tiposSelecionados.length > 0 ? `(${tiposSelecionados.join(' / ')})` : '';

            btnSalvarImprimir.disabled = true;
            btnSalvarImprimir.style.opacity = "0.5";
            msgStatus.style.display = "block";
            msgStatus.style.color = "var(--accent-strong)";
            msgStatus.style.background = "var(--accent-soft)";
            msgStatus.textContent = "⏳ A gravar registo no sistema e a gerar ficha...";

            const dados = {
                token: localStorage.getItem('monad_token'),
                empresa: empresa,
                tipoExame: tipoExame,
                nome: nome,
                funcao: funcao,
                dn: dn,
                rg: document.querySelector('[name="rg"]').value.trim(),
                cpf: document.querySelector('[name="cpf"]').value.trim(),
                telefone: document.querySelector('[name="telefone"]').value.trim(),
                dataExame: dataExame,
                examesClinicos: Array.from(document.querySelectorAll('.master-checkbox[data-setor="clinico"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                examesRaioX: Array.from(document.querySelectorAll('.master-checkbox[data-setor="raiox"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                examesLab: Array.from(document.querySelectorAll('.master-checkbox[data-setor="lab"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                audiometria: checkAudio ? checkAudio.checked : false,
                consultaClinica: document.getElementById('check-consulta') ? document.getElementById('check-consulta').checked : false
            };

            // USA O NOVO FUNIL DE REDE (monadFetch)
            window.monadFetch(URL_GOOGLE_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(dados)
            })
            .then(r => r.json())
            .then(data => {
                if (data.status !== "sucesso") throw new Error(data.detalhe);
                msgStatus.textContent = "✅ Guardado com sucesso! A preparar impressão...";
                msgStatus.style.color = "var(--success)";
                msgStatus.style.background = "var(--success-soft)";
                setTimeout(() => {
                    msgStatus.style.display = "none";
                    btnSalvarImprimir.disabled = false;
                    btnSalvarImprimir.style.opacity = "1";
                    window.print(); 
                }, 1500);
            })
            .catch((err) => {
                msgStatus.textContent = "❌ Erro ao guardar. " + (err.message || "Verifique a internet.");
                msgStatus.style.color = "var(--danger)";
                msgStatus.style.background = "var(--danger-soft)";
                btnSalvarImprimir.disabled = false;
                btnSalvarImprimir.style.opacity = "1";
            });
        });
    }
});