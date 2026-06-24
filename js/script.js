document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbyf3csqhMdP2uwUa0JXNZ0zdCWji4W3UOngOK26DSWxf0OlNzyMxEwBJdDhuwZN06DXig/exec";
    // ==========================================

    const masterInputs = document.querySelectorAll('.master-input');
    const masterCheckboxes = document.querySelectorAll('.master-checkbox');
    const btnSalvarImprimir = document.getElementById('btn-salvar-imprimir');
    const msgStatus = document.getElementById('msg-status');

    const cpfInput = document.querySelector('input[name="cpf"]');
    const telefoneInput = document.querySelector('input[name="telefone"]');
    const cpfError = document.getElementById('cpf-error');

    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); 
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
            else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            e.target.value = v;
            cpfError.style.display = 'none';
            cpfInput.style.borderColor = '#ccc';
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
            document.querySelectorAll(`.out-${e.target.name}`).forEach(span => {
                span.textContent = valorDigitado;
            });
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
            exames[cb.dataset.setor].push(cb.dataset.nome);
        });

        Object.keys(exames).forEach(setor => {
            const ul = document.getElementById(`lista-${setor}`);
            if (ul) ul.innerHTML = exames[setor].length === 0 ? '<li class="vazio">Nenhum exame selecionado</li>' : exames[setor].map(e => `<li>${e}</li>`).join('');
        });
    }
    masterCheckboxes.forEach(cb => cb.addEventListener('change', atualizarListaExames));

    const checkAudio = document.getElementById('check-audiometria');
    const setorAudio = document.getElementById('setor-audio');
    if (checkAudio && setorAudio) {
        checkAudio.addEventListener('change', () => setorAudio.style.display = checkAudio.checked ? 'flex' : 'none');
        setorAudio.style.display = checkAudio.checked ? 'flex' : 'none';
    }

    if (btnSalvarImprimir) {
        btnSalvarImprimir.addEventListener('click', function() {
            if (cpfInput.value && !validarCPF(cpfInput.value)) {
                alert("CPF inválido.");
                return cpfInput.focus();
            }

            btnSalvarImprimir.disabled = true;
            btnSalvarImprimir.style.opacity = "0.5";
            msgStatus.style.display = "block";
            msgStatus.style.color = "#004080";
            msgStatus.textContent = "A guardar registo no sistema...";

            const dados = {
                empresa: document.querySelector('[name="empresa"]').value,
                nome: document.querySelector('[name="nome"]').value,
                funcao: document.querySelector('[name="funcao"]').value,
                dn: document.querySelector('[name="dn"]').value,
                rg: document.querySelector('[name="rg"]').value,
                cpf: document.querySelector('[name="cpf"]').value,
                telefone: document.querySelector('[name="telefone"]').value,
                dataExame: document.querySelector('[name="data"]').value,
                examesClinicos: Array.from(document.querySelectorAll('.master-checkbox[data-setor="clinico"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                examesRaioX: Array.from(document.querySelectorAll('.master-checkbox[data-setor="raiox"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                examesLab: Array.from(document.querySelectorAll('.master-checkbox[data-setor="lab"]:checked')).map(cb=>cb.dataset.nome).join(', ') || 'Nenhum',
                audiometria: checkAudio ? checkAudio.checked : false,
                consultaClinica: document.getElementById('check-consulta') ? document.getElementById('check-consulta').checked : false
            };

            // FIM DO NO-CORS! COMUNICAÇÃO TOTALMENTE SEGURA:
            fetch(URL_GOOGLE_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(dados)
            })
            .then(r => r.json())
            .then(data => {
                if (data.status !== "sucesso") throw new Error();
                msgStatus.textContent = "✅ Guardado com sucesso! A preparar impressão...";
                msgStatus.style.color = "green";
                setTimeout(() => {
                    msgStatus.style.display = "none";
                    btnSalvarImprimir.disabled = false;
                    btnSalvarImprimir.style.opacity = "1";
                    window.print(); 
                    document.getElementById("masterForm").reset();
                    atualizarListaExames(); 
                }, 1500);
            })
            .catch(() => {
                msgStatus.textContent = "❌ Erro ao guardar. Verifique a internet.";
                msgStatus.style.color = "red";
                btnSalvarImprimir.disabled = false;
                btnSalvarImprimir.style.opacity = "1";
            });
        });
    }
});