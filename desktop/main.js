const path = require('node:path');
const { app, BrowserWindow, dialog } = require('electron');
const { criarAtualizador, INTERVALO_MIN } = require('./atualizador');

// Em dev carrega o Next.js local; em producao o endereco fixo da API/web (PRD Q2, em aberto).
const URL_APP = process.env.VATECH_URL || 'http://localhost:3000';

let janela = null;

function criarJanela() {
  janela = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  // O servidor do web pode demorar a arrancar: tenta de novo enquanto falha.
  janela.webContents.on('did-fail-load', () => setTimeout(() => janela && !janela.isDestroyed() && janela.loadURL(URL_APP), 1000));
  janela.on('closed', () => { janela = null; });
  janela.loadURL(URL_APP);
}

// Auto-atualizacao (issue #21): a raiz do repo e a pasta pai de desktop/.
const atualizador = criarAtualizador({
  raiz: path.resolve(__dirname, '..'),
  log: (linha) => console.log(linha),
});
let avisoAberto = false;

async function verificarAtualizacao() {
  const r = await atualizador.verificar();
  if (r.estado !== 'atualizado' || avisoAberto) return;
  avisoAberto = true;
  try {
    const opcoes = {
      type: 'info',
      title: 'vatech',
      message: 'Há uma versão nova. Atualizada.',
      detail: 'Reiniciar agora?',
      buttons: ['Reiniciar agora', 'Mais tarde'],
      defaultId: 0,
      cancelId: 1,
    };
    const { response } = janela && !janela.isDestroyed()
      ? await dialog.showMessageBox(janela, opcoes)
      : await dialog.showMessageBox(opcoes);
    if (response === 0) {
      app.relaunch();
      app.exit(0);
    }
  } finally {
    avisoAberto = false;
  }
}

app.whenReady().then(() => {
  criarJanela();
  verificarAtualizacao();
  setInterval(verificarAtualizacao, INTERVALO_MIN * 60 * 1000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
