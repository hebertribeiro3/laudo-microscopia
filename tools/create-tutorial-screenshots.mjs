import { chromium } from '/Users/hebertribeiro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/Users/hebertribeiro/laudo';
const outDir = path.join(root, 'tutorial-assets', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--allow-file-access-from-files', '--disable-web-security']
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1
});

await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

// A tela de login e uma conta ficticia sao usadas somente nas imagens do tutorial.
await page.locator('#modal-login').evaluate((el) => el.classList.add('active'));
await page.screenshot({ path: path.join(outDir, '01-login.png') });

await page.addStyleTag({ content: `
  #modal-login { display: none !important; }
  .tutorial-focus { outline: 4px solid #10b981 !important; outline-offset: 4px; box-shadow: 0 0 0 10px rgba(16,185,129,.16) !important; }
` });

await page.evaluate(() => {
  document.getElementById('user-session-bar').innerHTML = `
    <div class="user-top-row">
      <div class="user-info">
        <div class="user-avatar">M</div>
        <div class="user-details">
          <span class="user-name">Maria Souza</span>
          <span class="user-role-badge badge-role-consultor">CONSULTORA</span>
        </div>
      </div>
      <button type="button" class="user-action-btn btn-logout"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
    </div>
    <div class="user-actions">
      <button type="button" class="user-action-btn"><i class="fa-solid fa-tractor"></i> Clientes</button>
      <button type="button" class="user-action-btn" id="tutorial-laudos"><i class="fa-solid fa-folder-open"></i> Laudos</button>
      <button type="button" class="user-action-btn"><i class="fa-solid fa-key"></i> Senha</button>
    </div>`;
});

await page.locator('#btn-load-demo').click();
await page.evaluate(() => {
  const nome = 'Maria Souza';
  for (const id of ['responsavel_coleta', 'responsavel_analise']) {
    const field = document.getElementById(id);
    field.value = nome;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.getElementById('btn-load-demo').classList.add('tutorial-focus');
});
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outDir, '02-exemplo.png') });

await page.evaluate(() => {
  document.getElementById('btn-load-demo').classList.remove('tutorial-focus');
  const form = document.getElementById('laudo-form');
  form.scrollTop = 430;
  const section = document.getElementById('ph').closest('.form-section');
  section.classList.add('tutorial-focus');
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, '03-preenchimento.png') });

await page.evaluate(() => {
  document.querySelectorAll('.tutorial-focus').forEach((el) => el.classList.remove('tutorial-focus'));
  const form = document.getElementById('laudo-form');
  form.scrollTop = form.scrollHeight;
  document.getElementById('photo_40x').closest('.form-section').classList.add('tutorial-focus');
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, '04-fotos.png') });

await page.evaluate(() => {
  document.querySelectorAll('.tutorial-focus').forEach((el) => el.classList.remove('tutorial-focus'));
  document.getElementById('btn-print').classList.add('tutorial-focus');
});
await page.screenshot({ path: path.join(outDir, '05-gerar.png') });

await page.evaluate(() => {
  document.getElementById('btn-print').classList.remove('tutorial-focus');
  const modal = document.getElementById('modal-laudos');
  modal.classList.add('active');
  document.getElementById('laudos-count-badge').textContent = '2';
  document.getElementById('laudos-table-body').innerHTML = `
    <tr>
      <td><strong>001-26</strong></td><td>Fazenda Exemplo</td><td>Solu Leaf</td>
      <td><em style="color:#004d20">Bacillus subtilis</em></td><td>09/09/2026</td>
      <td>Maria Souza</td><td><span class="user-role-badge badge-role-consultor" style="font-size:8px">Consultora</span></td>
      <td><span class="user-role-badge" style="background:#dcfce7;color:#166534">Sincronizado</span></td>
      <td style="text-align:right"><div class="table-actions" style="justify-content:flex-end">
        <button class="btn-sm-action btn-view">Editar</button><button class="btn-sm-action btn-print-sm">PDF</button><button class="btn-sm-action btn-del">Excluir</button>
      </div></td>
    </tr>
    <tr>
      <td><strong>002-26</strong></td><td>Cliente Demonstração</td><td>Bio Balance</td>
      <td><em style="color:#004d20">Bacillus amyloliquefaciens</em></td><td>08/09/2026</td>
      <td>Maria Souza</td><td><span class="user-role-badge badge-role-consultor" style="font-size:8px">Consultora</span></td>
      <td><span class="user-role-badge" style="background:#dcfce7;color:#166534">Sincronizado</span></td>
      <td style="text-align:right"><div class="table-actions" style="justify-content:flex-end">
        <button class="btn-sm-action btn-view">Editar</button><button class="btn-sm-action btn-print-sm">PDF</button><button class="btn-sm-action btn-del">Excluir</button>
      </div></td>
    </tr>`;
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, '06-repositorio.png') });

await page.evaluate(() => document.getElementById('modal-laudos').classList.remove('active'));
await page.locator('#laudo-sheet').screenshot({ path: path.join(outDir, '07-laudo.png') });

await browser.close();
console.log(outDir);
