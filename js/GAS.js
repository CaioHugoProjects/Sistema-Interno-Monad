var SECRET_KEY = "MONAD_SECURE_KEY_2026_MASTER";

// ==========================================
// 1. SEGURANÇA E CRIPTOGRAFIA (SHA-256)
// ==========================================
function gerarToken(usuario) {
  var timestamp = new Date().getTime();
  var raw = usuario + "|" + timestamp + "|" + SECRET_KEY;
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var hash = signature.map(function(e) {return ("0" + (e < 0 ? e + 256 : e).toString(16)).slice(-2)}).join("");
  var tokenString = usuario + "|" + timestamp + "|" + hash;
  return Utilities.base64Encode(tokenString);
}

function validarToken(token) {
  if (!token) return false;
  try {
    var decodificado = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var partes = decodificado.split("|");
    if (partes.length !== 3) return false;
    
    var usuario = partes[0];
    var timestamp = parseInt(partes[1], 10);
    var hashRecebido = partes[2];
    
    // Expira em 12 horas
    if (new Date().getTime() - timestamp > 43200000) return false;
    
    var raw = usuario + "|" + timestamp + "|" + SECRET_KEY;
    var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
    var hashCalculado = signature.map(function(e) {return ("0" + (e < 0 ? e + 256 : e).toString(16)).slice(-2)}).join("");
    
    return hashRecebido === hashCalculado;
  } catch(e) { return false; }
}

function extrairUsuario(token) {
  try {
    return Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString().split("|")[0];
  } catch(e) { return "SISTEMA"; }
}

// ==========================================
// 2. KILL-SWITCH TEMPORAL E AUDITORIA
// ==========================================
function operacaoPermitida() {
  var now = new Date();
  var hourString = Utilities.formatDate(now, "America/Sao_Paulo", "HH");
  var minString = Utilities.formatDate(now, "America/Sao_Paulo", "mm");
  var timeFloat = parseInt(hourString, 10) + (parseInt(minString, 10) / 60);
  
  // Bloqueio fora da margem 06h30 às 14h00
  if (timeFloat < 6.5 || timeFloat >= 23.0) return false;
  return true;
}

function registrarLog(usuario, acao, cpf, detalhes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetLogs = ss.getSheetByName("LOGS_SISTEMA");
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet("LOGS_SISTEMA");
    sheetLogs.appendRow(["DATA_HORA", "USUARIO", "ACAO", "CPF", "DETALHES"]);
    sheetLogs.getRange("A1:E1").setFontWeight("bold");
  }
  sheetLogs.appendRow([new Date(), usuario.toUpperCase(), acao, cpf, detalhes]);
}

// ==========================================
// 3. CONTROLADORES DE ROTA
// ==========================================
function doPost(e) {
  if (!operacaoPermitida()) {
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Expediente encerrado. Banco de dados trancado."})).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var dados = JSON.parse(e.postData.contents);
    if (dados.acao === "EFETUAR_LOGIN") return verificarCredenciais(dados);
    
    if (!validarToken(dados.token)) {
      return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Acesso não autorizado ou token expirado."})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var usuario = extrairUsuario(dados.token);
    
    if (dados.acao === "ATUALIZAR_SETOR") return executarComLock(atualizarSetorPaciente, dados, usuario);
    if (dados.acao === "ATUALIZAR_OBS") return executarComLock(atualizarObservacao, dados, usuario);
    if (dados.acao === "DELETAR_PACIENTE") return executarComLock(deletarPaciente, dados, usuario);
    if (dados.acao === "EDITAR_PACIENTE") return executarComLock(editarPaciente, dados, usuario); 
    
    if (dados.acao === "CHAMAR_PACIENTE") {
      PropertiesService.getScriptProperties().setProperty("ULTIMA_CHAMADA", JSON.stringify({ nome: dados.nome, cpf: dados.cpf, timestamp: new Date().getTime() }));
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (dados.acao === "CADASTRAR_PACIENTE" || !dados.acao) return executarComLock(cadastrarPaciente, dados, usuario);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Ação desconhecida."})).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": erro.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (!operacaoPermitida()) return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Expediente encerrado."})).setMimeType(ContentService.MimeType.JSON);

  try {
    if (e.parameter.obterChamada === 'true') {
      var ultimaChamada = PropertiesService.getScriptProperties().getProperty("ULTIMA_CHAMADA");
      return ContentService.createTextOutput(ultimaChamada || JSON.stringify({nome: null})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var isBuscaGlobal = (e.parameter.buscaGlobal === 'true');
    if (!e.parameter.dataExame && !isBuscaGlobal) return ContentService.createTextOutput("API Monad Online e Blindada.");
    
    var data = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getDisplayValues(); 
    var dataPedida = e.parameter.dataExame || ""; 
    var partes = dataPedida.split('-');
    var dataPedidaBR = partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "";
    var resultados = [];

    // Paginação: Lê apenas as últimas 500 linhas na rotina diária
    var limiteFundo = isBuscaGlobal ? 1 : Math.max(1, data.length - 500);

    for (var i = data.length - 1; i >= limiteFundo; i--) {
      var linha = data[i];
      
      // Filtro Soft Delete: Ignora registros inativos
      if (String(linha[21]).trim().toUpperCase() === "INATIVO") continue;
      
      var dataPlanilha = linha[9] ? linha[9].trim() : "";
      
      if (isBuscaGlobal || dataPlanilha === dataPedida || dataPlanilha === dataPedidaBR) {
        var dnVisual = linha[4] && linha[4].includes("-") ? linha[4].split("-").reverse().join("/") : (linha[4] || "-");
        
        resultados.unshift({
          empresa: linha[1] || '-', nome: linha[2] || '-', funcao: linha[3] || '-', 
          dn: dnVisual, rg: linha[5] || '-', cpf: linha[6] || '-', telefone: linha[7] || '-', 
          tipoExame: linha[8] || '', dataExame: dataPlanilha || '-',
          examesClinicos: linha[10] || "", examesRaioX: linha[11] || "", 
          examesLab: linha[12] || "", obsLab: linha[18] || "",
          temClinico: linha[10] !== "" && linha[10].toUpperCase() !== "NENHUM" && linha[10].toUpperCase() !== "FALSE",
          temRaiox: linha[11] !== "" && linha[11].toUpperCase() !== "NENHUM" && linha[11].toUpperCase() !== "FALSE",
          temLab: linha[12] !== "" && linha[12].toUpperCase() !== "NENHUM" && linha[12].toUpperCase() !== "FALSE",
          temFono: linha[13] !== "" && linha[13].toUpperCase() !== "NENHUM" && linha[13].toUpperCase() !== "FALSE",
          temConsulta: linha[19] !== "" && linha[19].toUpperCase() !== "NENHUM" && linha[19].toUpperCase() !== "FALSE",
          liberadoClinico: ["TRUE", "VERDADEIRO"].includes(String(linha[14]).trim().toUpperCase()),
          liberadoRaiox: ["TRUE", "VERDADEIRO"].includes(String(linha[15]).trim().toUpperCase()),
          liberadoFono: ["TRUE", "VERDADEIRO"].includes(String(linha[16]).trim().toUpperCase()),
          liberadoLab: ["TRUE", "VERDADEIRO"].includes(String(linha[17]).trim().toUpperCase()),
          liberadoConsulta: ["TRUE", "VERDADEIRO"].includes(String(linha[20]).trim().toUpperCase())
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({status: "sucesso", pacientes: resultados})).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) { return ContentService.createTextOutput(JSON.stringify({status: "erro", detalhe: erro.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

// ==========================================
// 4. MOTOR DE ENFILEIRAMENTO E GRAVAÇÃO
// ==========================================
function executarComLock(funcaoOperacao, dados, usuario) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Servidor processando outra ficha. Tente novamente."})).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    return funcaoOperacao(dados, SpreadsheetApp.getActiveSpreadsheet().getSheets()[0], usuario);
  } finally {
    lock.releaseLock(); 
  }
}

function cadastrarPaciente(dados, sheet, usuario) {
  if (!dados.nome || dados.nome.trim() === "" || !dados.cpf || dados.cpf.trim() === "") {
    return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Nome e CPF obrigatórios."})).setMimeType(ContentService.MimeType.JSON);
  }
  sheet.appendRow([
    new Date(), dados.empresa || "", dados.nome || "", dados.funcao || "", dados.dn || "", dados.rg || "", 
    dados.cpf || "", dados.telefone || "", dados.tipoExame || "", (dados.dataExame ? "'" + dados.dataExame : ""), 
    dados.examesClinicos || "Nenhum", dados.examesRaioX || "Nenhum", dados.examesLab || "Nenhum", 
    dados.audiometria || false, false, false, false, false, "", dados.consultaClinica || false, false, "ATIVO"
  ]);
  registrarLog(usuario, "CADASTRO", dados.cpf, "Paciente Inserido.");
  return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
}

function editarPaciente(dados, sheet, usuario) {
  var dataDisplay = sheet.getDataRange().getDisplayValues(); 
  var cpfAntigo = String(dados.cpfAntigo || "").trim();
  
  for (var i = dataDisplay.length - 1; i >= Math.max(1, dataDisplay.length - 1000); i--) {
    if (String(dataDisplay[i][6]).trim() === cpfAntigo && String(dataDisplay[i][9]).trim() === String(dados.dataExame).trim()) {
      sheet.getRange(i + 1, 2, 1, 8).setValues([[ dados.empresa, dados.nome, dados.funcao, dados.dn, dados.rg, dados.cpfNovo, dados.telefone, dados.tipoExame ]]);
      sheet.getRange(i + 1, 11, 1, 3).setValues([[ dados.examesClinicos || "Nenhum", dados.examesRaioX || "Nenhum", dados.examesLab || "Nenhum" ]]);
      sheet.getRange(i + 1, 14).setValue(dados.audiometria === true);
      sheet.getRange(i + 1, 20).setValue(dados.consultaClinica === true);
      
      registrarLog(usuario, "EDICAO", dados.cpfNovo, "Dados do paciente alterados.");
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Paciente não encontrado."})).setMimeType(ContentService.MimeType.JSON);
}

function deletarPaciente(dados, sheet, usuario) {
  var dataDisplay = sheet.getDataRange().getDisplayValues();
  for (var i = dataDisplay.length - 1; i >= Math.max(1, dataDisplay.length - 1000); i--) {
    if (String(dataDisplay[i][6]).trim() === String(dados.cpf).trim()) {
      sheet.getRange(i + 1, 22).setValue("INATIVO"); // SOFT DELETE
      registrarLog(usuario, "EXCLUSAO_LOGICA", dados.cpf, "Paciente marcado como INATIVO. Não foi removido do banco.");
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Registo não encontrado."})).setMimeType(ContentService.MimeType.JSON);
}

function atualizarSetorPaciente(dados, sheet, usuario) {
  var data = sheet.getDataRange().getValues();
  var colunaAlvo = {"clinico": 15, "raiox": 16, "fono": 17, "lab": 18, "consulta": 21}[dados.setor];
  for (var i = data.length - 1; i >= Math.max(1, data.length - 500); i--) {
    if (String(data[i][6]).trim() === dados.cpf.trim()) {
      sheet.getRange(i + 1, colunaAlvo).setValue(dados.liberado ? true : false);
      registrarLog(usuario, "LIBERACAO_SETOR", dados.cpf, "Setor: " + dados.setor + " | Status: " + dados.liberado);
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "CPF não encontrado."})).setMimeType(ContentService.MimeType.JSON);
}

function atualizarObservacao(dados, sheet, usuario) {
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= Math.max(1, data.length - 500); i--) {
    if (String(data[i][6]).trim() === dados.cpf.trim()) {
      var dadoAnterior = String(data[i][18]);
      sheet.getRange(i + 1, 19).setValue(dados.obs);
      if (dadoAnterior !== dados.obs) registrarLog(usuario, "ALTEROU_OBS", dados.cpf, "De: '" + dadoAnterior + "' Para: '" + dados.obs + "'");
      return ContentService.createTextOutput(JSON.stringify({"status": "sucesso"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "CPF não encontrado"})).setMimeType(ContentService.MimeType.JSON);
}

function verificarCredenciais(dados) {
  var sheetUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("USUARIOS");
  if (!sheetUsuarios) return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Aba USUARIOS não encontrada."})).setMimeType(ContentService.MimeType.JSON);
  var data = sheetUsuarios.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(dados.usuario).trim().toLowerCase() && String(data[i][1]).trim() === String(dados.senha).trim()) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "sucesso", "setor": String(data[i][2]).trim().toLowerCase(), "token": gerarToken(dados.usuario) })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "erro", "detalhe": "Credenciais incorretas."})).setMimeType(ContentService.MimeType.JSON);
}
