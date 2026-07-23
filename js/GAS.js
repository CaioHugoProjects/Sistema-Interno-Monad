// Chave secreta para validação estática do token (mantenha isso seguro)
var SECRET_KEY = "MONAD_SECURE_KEY_2026";

function gerarToken(usuario) {
  var raw = usuario + "|" + SECRET_KEY;
  return Utilities.base64Encode(raw);
}

function validarToken(token) {
  if (!token) return false;
  try {
    var decodificado = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var partes = decodificado.split("|");
    return partes[1] === SECRET_KEY;
  } catch(e) { return false; }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPacientes = ss.getSheets()[0];
    var dados = JSON.parse(e.postData.contents);
    
    if (dados.acao === "EFETUAR_LOGIN") return verificarCredenciais(dados);
    
    if (!validarToken(dados.token)) {
      return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Acesso não autorizado."})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (dados.acao === "ATUALIZAR_SETOR") return atualizarSetorPaciente(dados);
    if (dados.acao === "ATUALIZAR_OBS") return atualizarObservacao(dados);
    if (dados.acao === "DELETAR_PACIENTE") return deletarPaciente(dados);
    if (dados.acao === "EDITAR_PACIENTE") return editarPaciente(dados); 
    
    // =======================================================
    // NOVA ROTA: O MÉDICO CHAMA O PACIENTE
    // Grava o chamado temporariamente na memória do servidor
    // =======================================================
    if (dados.acao === "CHAMAR_PACIENTE") {
      PropertiesService.getScriptProperties().setProperty("ULTIMA_CHAMADA", JSON.stringify({
        nome: dados.nome,
        cpf: dados.cpf,
        timestamp: new Date().getTime()
      }));
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (dados.acao === "CADASTRAR_PACIENTE" || !dados.acao) {
      var lock = LockService.getScriptLock();
      
      if (!lock.tryLock(10000)) {
         return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Servidor ocupado. Tente novamente."})).setMimeType(ContentService.MimeType.JSON);
      }
      
      try {
        var dataCadastro = new Date();
        sheetPacientes.appendRow([
          dataCadastro, dados.empresa || "", dados.nome || "", dados.funcao || "",
          dados.dn || "", dados.rg || "", dados.cpf || "", dados.telefone || "", 
          dados.tipoExame || "", 
          dados.dataExame || "", dados.examesClinicos || "Nenhum", dados.examesRaioX || "Nenhum",
          dados.examesLab || "Nenhum", dados.audiometria || false,
          false, false, false, false, "", dados.consultaClinica || false, false
        ]);
        return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock(); 
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Ação desconhecida."})).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": erro.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function editarPaciente(dados) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var dataDisplay = sheet.getDataRange().getDisplayValues(); 
    var cpfAntigo = String(dados.cpfAntigo || "").trim();
    var dataExame = String(dados.dataExame || "").trim();

    for (var i = dataDisplay.length - 1; i >= 1; i--) {
      var cpfPlanilha = String(dataDisplay[i][6] || "").trim();
      var dataPlanilha = String(dataDisplay[i][9] || "").trim();

      if (cpfPlanilha === cpfAntigo && dataPlanilha === dataExame) {
        
        var arrayPessoais = [[
          dados.empresa || "", dados.nome || "", dados.funcao || "", 
          dados.dn || "", dados.rg || "", dados.cpfNovo || "", dados.telefone || "",
          dados.tipoExame || "" 
        ]];
        sheet.getRange(i + 1, 2, 1, 8).setValues(arrayPessoais);
        
        var arrayExames = [[ dados.examesClinicos || "Nenhum", dados.examesRaioX || "Nenhum", dados.examesLab || "Nenhum" ]];
        sheet.getRange(i + 1, 11, 1, 3).setValues(arrayExames);
        
        sheet.getRange(i + 1, 14).setValue(dados.audiometria === true);
        sheet.getRange(i + 1, 20).setValue(dados.consultaClinica === true);

        return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Paciente não encontrado."})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": e.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function deletarPaciente(dados) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var dataDisplay = sheet.getDataRange().getDisplayValues();
    var cpfAlvo = String(dados.cpf || "").trim();
    var dataExame = String(dados.dataExame || "").trim();

    for (var i = dataDisplay.length - 1; i >= 1; i--) {
      var cpfPlanilha = String(dataDisplay[i][6] || "").trim();
      var dataPlanilha = String(dataDisplay[i][9] || "").trim();

      if (cpfPlanilha === cpfAlvo && dataPlanilha === dataExame) {
        sheet.deleteRow(i + 1); 
        return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Registo não encontrado."})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": e.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function verificarCredenciais(dados) {
  try {
    var sheetUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("USUARIOS");
    if (!sheetUsuarios) return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Aba USUARIOS não encontrada."})).setMimeType(ContentService.MimeType.JSON);
    var data = sheetUsuarios.getDataRange().getValues();
    var userDigitado = String(dados.usuario).trim().toLowerCase();
    var senhaDigitada = String(dados.senha).trim();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === userDigitado && String(data[i][1]).trim() === senhaDigitada) {
        var tokenSeguro = gerarToken(userDigitado);
        return ContentService.createTextOutput(JSON.stringify({ "status": "sucesso", "setor": String(data[i][2]).trim().toLowerCase(), "token": tokenSeguro })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Usuário ou senha incorretos."})).setMimeType(ContentService.MimeType.JSON);
  } catch(e) { return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": e.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function atualizarSetorPaciente(dados) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var colunaAlvo = {"clinico": 15, "raiox": 16, "fono": 17, "lab": 18, "consulta": 21}[dados.setor];
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][6]).trim() === dados.cpf.trim()) {
      sheet.getRange(i + 1, colunaAlvo).setValue(dados.liberado ? true : false);
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "CPF não encontrado."})).setMimeType(ContentService.MimeType.JSON);
}

function atualizarObservacao(dados) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][6]).trim() === dados.cpf.trim()) {
      sheet.getRange(i + 1, 19).setValue(dados.obs);
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "CPF não encontrado"})).setMimeType(ContentService.MimeType.JSON);
}


function doGet(e) {
  try {
    // =======================================================
    // NOVA ROTA: O PAINEL DA RECEPÇÃO LÊ QUEM FOI CHAMADO
    // =======================================================
    if (e.parameter.obterChamada === 'true') {
      var ultimaChamada = PropertiesService.getScriptProperties().getProperty("ULTIMA_CHAMADA");
      return ContentService.createTextOutput(ultimaChamada || JSON.stringify({nome: null})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var isBuscaGlobal = (e.parameter.buscaGlobal === 'true');
    
    if (!e.parameter.dataExame && !isBuscaGlobal) {
      return ContentService.createTextOutput("API online.");
    }
    
    var data = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getDisplayValues(); 
    
    var dataPedida = e.parameter.dataExame || ""; 
    var partes = dataPedida.split('-');
    var dataPedidaBR = partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "";
    var resultados = [];

    for (var i = data.length - 1; i >= 1; i--) {
      var linha = data[i];
      var dataPlanilha = linha[9] ? linha[9].trim() : "";
      
      if (isBuscaGlobal || dataPlanilha === dataPedida || dataPlanilha === dataPedidaBR) {
        
        var dnVisual = linha[4] && linha[4].includes("-") ? linha[4].split("-").reverse().join("/") : (linha[4] || "-");

        var vClinico = linha[10] ? String(linha[10]).trim().toUpperCase() : "";
        var vRaiox   = linha[11] ? String(linha[11]).trim().toUpperCase() : "";
        var vLab     = linha[12] ? String(linha[12]).trim().toUpperCase() : "";
        var vFono    = linha[13] ? String(linha[13]).trim().toUpperCase() : "";
        var vConsul  = linha[19] ? String(linha[19]).trim().toUpperCase() : "";

        var temC = vClinico !== "" && vClinico !== "NENHUM" && vClinico !== "FALSE" && vClinico !== "FALSO";
        var temR = vRaiox !== "" && vRaiox !== "NENHUM" && vRaiox !== "FALSE" && vRaiox !== "FALSO";
        var temL = vLab !== "" && vLab !== "NENHUM" && vLab !== "FALSE" && vLab !== "FALSO";
        var temF = vFono !== "" && vFono !== "NENHUM" && vFono !== "FALSE" && vFono !== "FALSO";
        var temM = vConsul !== "" && vConsul !== "NENHUM" && vConsul !== "FALSE" && vConsul !== "FALSO";

        if (temC || temR || temL || temF || temM) {
          resultados.unshift({
            empresa: linha[1] || '-', nome: linha[2] || '-', funcao: linha[3] || '-', 
            dn: dnVisual, rg: linha[5] || '-', cpf: linha[6] || '-', telefone: linha[7] || '-', 
            tipoExame: linha[8] || '',
            dataExame: dataPlanilha || '-',
            examesClinicos: linha[10] || "", examesRaioX: linha[11] || "", 
            examesLab: linha[12] || "", obsLab: linha[18] || "",
            temClinico: temC, temRaiox: temR, temLab: temL, temFono: temF, temConsulta: temM,
            liberadoClinico: ["TRUE", "VERDADEIRO"].includes(String(linha[14]).trim().toUpperCase()),
            liberadoRaiox: ["TRUE", "VERDADEIRO"].includes(String(linha[15]).trim().toUpperCase()),
            liberadoFono: ["TRUE", "VERDADEIRO"].includes(String(linha[16]).trim().toUpperCase()),
            liberadoLab: ["TRUE", "VERDADEIRO"].includes(String(linha[17]).trim().toUpperCase()),
            liberadoConsulta: ["TRUE", "VERDADEIRO"].includes(String(linha[20]).trim().toUpperCase())
          });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({status: "sucesso", pacientes: resultados})).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) { return ContentService.createTextOutput(JSON.stringify({status: "erro", detalhe: erro.toString()})).setMimeType(ContentService.MimeType.JSON); }
}