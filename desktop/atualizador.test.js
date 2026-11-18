const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAtualizador } = require('./atualizador');

// Executor falso: regista chamadas; as opcoes definem as respostas do git.
function montar(opc = {}) {
  const e = { branch: 'main', suja: '', atras: '1', antes: 'aaaaaaa1', depois: 'bbbbbbb2', ficheiros: [], ...opc };
  const chamadas = [];
  const logs = [];
  let rev = 0;
  const exec = async (cmd, args) => {
    chamadas.push([cmd, ...args].join(' '));
    const k = args.join(' ');
    if (cmd === 'git') {
      if (k === 'rev-parse --abbrev-ref HEAD') return e.branch;
      if (k === 'status --porcelain') return e.suja;
      if (k === 'fetch origin') {
        if (e.fetchErro) throw new Error('Could not resolve host: github.com');
        return '';
      }
      if (k === 'rev-list --count HEAD..origin/main') return e.atras;
      if (k === 'rev-parse HEAD') return rev++ === 0 ? e.antes : e.depois;
      if (k === 'pull --ff-only origin main') {
        if (e.pullErro) throw new Error('fatal: Not possible to fast-forward, aborting.');
        return '';
      }
      if (k.startsWith('diff --name-only')) {
        assert.equal(k, `diff --name-only ${e.antes} ${e.depois}`);
        return e.ficheiros.join('\n');
      }
    }
    if (cmd === 'docker' && k === 'info' && e.dockerParado) throw new Error('docker parado');
    return '';
  };
  const at = criarAtualizador({ raiz: '/repo', exec, log: (l) => logs.push(l) });
  return { at, chamadas, logs };
}
const pulls = (c) => c.filter((x) => x.startsWith('git pull'));
const proibidos = /reset|stash|checkout|clean|--force| -f( |$)/;

test('em dia: nao puxa nem actua', async () => {
  const { at, chamadas } = montar({ atras: '0' });
  assert.equal((await at.verificar()).estado, 'em-dia');
  assert.equal(pulls(chamadas).length, 0);
});

test('atras e limpo: pull --ff-only; so docs -> nenhuma accao', async () => {
  const { at, chamadas } = montar({ ficheiros: ['docs/DECISIONS.md', 'README.md'] });
  const r = await at.verificar();
  assert.equal(r.estado, 'atualizado');
  assert.deepEqual(pulls(chamadas), ['git pull --ff-only origin main']);
  assert.deepEqual(r.accoes, []);
  assert.ok(!chamadas.some((c) => c.startsWith('npm') || c.startsWith('docker')));
});

test('lockfile do web mudou -> npm ci so no web', async () => {
  const { at, chamadas } = montar({ ficheiros: ['web/package-lock.json', 'web/src/x.ts'] });
  const r = await at.verificar();
  assert.deepEqual(r.accoes, ['npm ci web']);
  assert.ok(!chamadas.some((c) => c.startsWith('docker')));
});

test('lockfile do desktop mudou -> npm ci no desktop', async () => {
  const { at } = montar({ ficheiros: ['desktop/package-lock.json'] });
  assert.deepEqual((await at.verificar()).accoes, ['npm ci desktop']);
});

test('package.json sem lockfile -> sem npm ci', async () => {
  const { at, chamadas } = montar({ ficheiros: ['web/package.json'] });
  await at.verificar();
  assert.ok(!chamadas.some((c) => c.startsWith('npm')));
});

test('backend mudou -> docker compose restart api', async () => {
  const alvos = ['app/Models/X.php', 'routes/api.php', 'database/migrations/1.php', 'config/a.php', 'docker/api/entrypoint.sh', 'composer.lock', 'composer.json'];
  for (const f of alvos) {
    const { at, chamadas } = montar({ ficheiros: [f] });
    const r = await at.verificar();
    assert.deepEqual(r.accoes, ['docker compose restart api'], f);
    assert.ok(chamadas.includes('docker compose restart api'));
  }
});

test('backend mudou mas docker parado -> ignora, sem erro', async () => {
  const { at, chamadas } = montar({ ficheiros: ['app/X.php'], dockerParado: true });
  const r = await at.verificar();
  assert.equal(r.estado, 'atualizado');
  assert.ok(!chamadas.includes('docker compose restart api'));
});

test('arvore suja: nao puxa', async () => {
  const { at, chamadas } = montar({ suja: ' M web/x.ts' });
  assert.equal((await at.verificar()).estado, 'ignorado');
  assert.equal(pulls(chamadas).length, 0);
  assert.ok(!chamadas.includes('git fetch origin'));
});

test('branch nao-main: nao puxa', async () => {
  const { at, chamadas } = montar({ branch: 'feat/x' });
  assert.equal((await at.verificar()).estado, 'ignorado');
  assert.equal(pulls(chamadas).length, 0);
});

test('erro de rede: silencioso, 1 linha de log, sem excepcao', async () => {
  const { at, chamadas, logs } = montar({ fetchErro: true });
  const r = await at.verificar();
  assert.equal(r.estado, 'erro');
  assert.equal(logs.length, 1);
  assert.equal(pulls(chamadas).length, 0);
});

test('pull nao-ff: nao forca, sem accoes, nunca comandos destrutivos', async () => {
  const { at, chamadas, logs } = montar({ pullErro: true, ficheiros: ['app/X.php'] });
  const r = await at.verificar();
  assert.equal(r.estado, 'erro');
  assert.equal(logs.length, 1);
  assert.deepEqual(pulls(chamadas), ['git pull --ff-only origin main']);
  assert.ok(!chamadas.some((c) => proibidos.test(c)));
  assert.ok(!chamadas.some((c) => c.startsWith('docker') || c.startsWith('npm')));
});

test('caminho feliz nunca usa comandos destrutivos', async () => {
  const { at, chamadas } = montar({ ficheiros: ['web/package-lock.json', 'app/X.php'] });
  await at.verificar();
  assert.ok(!chamadas.some((c) => proibidos.test(c)), chamadas.join('\n'));
});

test('ciclo sobreposto e ignorado', async () => {
  const { at, chamadas } = montar();
  const [a, b] = await Promise.all([at.verificar(), at.verificar()]);
  assert.deepEqual([a.estado, b.estado].sort(), ['atualizado', 'ocupado']);
  assert.equal(pulls(chamadas).length, 1);
  assert.notEqual((await at.verificar()).estado, 'ocupado');
});
