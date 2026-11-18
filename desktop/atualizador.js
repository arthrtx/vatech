// Auto-atualizacao a partir da main (issue #21). Logica pura: o executor de comandos
// (git/npm/docker) e injectado, para testar sem tocar no git real.
// Regras: so actua em `main` com arvore limpa; so `git pull --ff-only origin main`;
// nunca reset/stash/checkout/clean/force; falhas sao silenciosas (1 linha de log).
const { execFile } = require('node:child_process');

const INTERVALO_MIN = 10;
const PREFIXOS_BACKEND = ['app/', 'routes/', 'database/', 'config/', 'docker/'];
const FICHEIROS_BACKEND = ['composer.json', 'composer.lock'];

function executorReal(raiz) {
  return (cmd, args, opcoes = {}) =>
    new Promise((resolve, reject) => {
      const bin = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd;
      execFile(
        bin,
        args,
        {
          cwd: opcoes.cwd || raiz,
          timeout: 5 * 60 * 1000,
          windowsHide: true,
          shell: bin.endsWith('.cmd'),
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        },
        (erro, stdout) => {
          if (erro) reject(erro);
          else resolve(String(stdout));
        },
      );
    });
}

function tocaBackend(ficheiros) {
  return ficheiros.some((f) => FICHEIROS_BACKEND.includes(f) || PREFIXOS_BACKEND.some((p) => f.startsWith(p)));
}

function criarAtualizador({ raiz, exec = executorReal(raiz), log = () => {} }) {
  let emCurso = false;
  const git = async (...args) => (await exec('git', args, { cwd: raiz })).trim();

  async function verificar() {
    if (emCurso) return { estado: 'ocupado' };
    emCurso = true;
    try {
      if ((await git('rev-parse', '--abbrev-ref', 'HEAD')) !== 'main') return { estado: 'ignorado', motivo: 'branch' };
      if ((await git('status', '--porcelain')) !== '') return { estado: 'ignorado', motivo: 'arvore-suja' };

      await git('fetch', 'origin');
      if (Number(await git('rev-list', '--count', 'HEAD..origin/main')) === 0) return { estado: 'em-dia' };

      const antes = await git('rev-parse', 'HEAD');
      await git('pull', '--ff-only', 'origin', 'main');
      const depois = await git('rev-parse', 'HEAD');
      if (antes === depois) return { estado: 'em-dia' };

      const ficheiros = (await git('diff', '--name-only', antes, depois)).split('\n').filter(Boolean);
      const accoes = [];
      for (const pasta of ['web', 'desktop']) {
        if (ficheiros.includes(`${pasta}/package-lock.json`)) {
          try {
            await exec('npm', ['ci'], { cwd: `${raiz}/${pasta}` });
            accoes.push(`npm ci ${pasta}`);
          } catch (e) {
            log(`[atualizador] npm ci em ${pasta} falhou: ${String(e.message).split('\n')[0]}`);
          }
        }
      }
      if (tocaBackend(ficheiros)) {
        try {
          await exec('docker', ['info'], { cwd: raiz });
          let reiniciou = true;
          try {
            await exec('docker', ['compose', 'restart', 'api'], { cwd: raiz });
          } catch (e) {
            reiniciou = false;
            log(`[atualizador] docker compose restart api falhou: ${String(e.message).split('\n')[0]}`);
          }
          if (reiniciou) accoes.push('docker compose restart api');
        } catch (e) {
          log(`[atualizador] docker indisponivel, api nao reiniciada: ${String(e.message).split('\n')[0]}`);
        }
      }
      log(`[atualizador] atualizado ${antes.slice(0, 7)}..${depois.slice(0, 7)} (${ficheiros.length} ficheiros)`);
      return { estado: 'atualizado', ficheiros, accoes };
    } catch (e) {
      log(`[atualizador] sem atualizacao: ${String(e.message).split('\n')[0]}`);
      return { estado: 'erro' };
    } finally {
      emCurso = false;
    }
  }

  return { verificar };
}

module.exports = { criarAtualizador, executorReal, tocaBackend, INTERVALO_MIN };
