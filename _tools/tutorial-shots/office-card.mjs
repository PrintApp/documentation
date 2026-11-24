// Tutorial screenshots: the office business card (a dropdown from a table, details looked up from
// it), from a local editor through the save-blocking harness (see README.md).
// PORT=3012 OUT=<dir> node office-card.mjs [admin|customer|all]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1055/chrome-win/chrome.exe';
const DK = 'dom_a8e9c6f48750bff0770dbb73c94f0c67';
const DESIGN = 'design_01M86J3KGJ1DN0VQM6TVHMSRM9';
const PORT = process.env.PORT || '3012';
const BASE = `http://localhost:${PORT}/pfx/_tut-harness.html?embed=1&dk=${DK}&design=${DESIGN}`;
const OUT = process.env.OUT || 'C:/werks/pa/documentation/images/tutorials/office-card/';
const which = process.argv[2] || 'all';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE });

async function boot(admin) {
	const ctx = await browser.newContext({ viewport: { width: 1360, height: admin ? 1700 : 900 }, deviceScaleFactor: 2 });
	const page = await ctx.newPage();
	page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || t.includes('[tut]')) console.log('  console:', t.slice(0, 160)); });
	await page.goto(BASE + (admin ? '&admin=1&appmode=edit-design' : '&appmode=new-project'));
	await page.waitForFunction(() => window.__msgs && window.__msgs.some((m) => m.event === 'app:ready'), null, { timeout: 120000 });
	await page.addStyleTag({ content: 'header, #log { display: none !important; }' });
	const f = page.frames().find((fr) => fr !== page.mainFrame());
	await f.waitForFunction(() => !!window.__pfx, null, { timeout: 60000 });
	await page.waitForTimeout(6000);
	return { ctx, page, f };
}

const click = (loc) => loc.first().evaluate((el) => el.click());
const tab = async (f, id) => { await click(f.locator(`.sidebar .tabs button[data-cmd=tab][data-id=${id}]`)); await f.waitForTimeout(700); };
const text = (loc) => loc.first().innerText().then((t) => t.replace(/\s*\n\s*/g, ' | ').slice(0, 700)).catch(() => '(none)');
/** Pick an option the way a person does: the value, then input, then change. */
const choose = (loc, v) => loc.first().evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);

/** The sidebar's panel column, cut off below its last control. */
async function shotPanel(page, f, name, contentSel) {
	const panels = f.locator('.sidebar .panels').first();
	const box = await panels.boundingBox();
	const bottom = await f.evaluate((sel) => {
		const nodes = [...document.querySelectorAll(sel)].filter((n) => n.offsetParent);
		return Math.max(...nodes.map((n) => n.getBoundingClientRect().bottom));
	}, contentSel);
	const frameBox = await page.locator('iframe').boundingBox();
	const h = Math.min(box.height, (frameBox.y + bottom) - box.y + 28);
	await page.screenshot({ path: OUT + name, clip: { x: box.x + 10, y: box.y, width: box.width - 10, height: h } });
	console.log('  wrote', name, Math.round(box.width) + 'x' + Math.round(h));
}
async function shotEl(loc, name, pad = 12) {
	const page = loc.page();
	await loc.first().scrollIntoViewIfNeeded().catch(() => {});
	const b = await loc.first().boundingBox();
	await page.screenshot({ path: OUT + name, clip: { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 } });
	console.log('  wrote', name);
}
const closePanel = async (f) => { const b = f.locator('.data-panel [data-cmd=close]'); if (await b.count()) { await click(b); await f.waitForTimeout(500); } };
const openSources = async (f) => {
	await tab(f, 'design');
	if (!(await f.locator('.data-sources .ds-head.open').count())) await click(f.locator('.data-sources [data-cmd=toggle]'));
	await f.waitForTimeout(600);
};
const openRow = async (f, cmd, label) => {
	await openSources(f);
	await click(f.locator(`.data-sources button.ds-row[data-cmd=${cmd}]`, { hasText: label }));
	await f.waitForSelector('.data-panel', { timeout: 10000 });
	await f.waitForTimeout(900);
};

if (which === 'all' || which === 'admin') {
	console.log('admin');
	const { ctx, page, f } = await boot(true);

	await openSources(f);
	console.log('  sources:', await text(f.locator('.data-sources')));
	await shotEl(f.locator('.data-sources'), '04-data-sources.png', 8);

	await openRow(f, 'table', 'Offices');
	console.log('  table:', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '06-table-offices.png', '.data-panel .dp-body > *');
	await closePanel(f);

	await openRow(f, 'field', 'Office');
	console.log('  Office:', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '02-field-office.png', '.data-panel .dp-body > *');
	await closePanel(f);

	await openRow(f, 'field', 'Office address');
	console.log('  Office address:', await text(f.locator('.data-panel')));
	const trySel = f.locator('.data-panel .dp-try select');
	if (await trySel.count()) { await choose(trySel, 'Manchester'); await f.waitForTimeout(600); }
	console.log('  try:', await text(f.locator('.data-panel .dp-try')));
	await shotPanel(page, f, '03-field-address.png', '.data-panel .dp-body > *');
	await closePanel(f);

	await openRow(f, 'field', 'Office phone');
	console.log('  Office phone:', await text(f.locator('.data-panel')));
	await closePanel(f);
	await ctx.close();
}

if (which === 'all' || which === 'customer') {
	console.log('customer');
	const { ctx, page, f } = await boot(false);
	const full = async (name) => { await page.screenshot({ path: OUT + name }); console.log('  wrote', name); };
	const officeSel = f.locator('.form-module select', { has: f.locator('option[value="Manchester"]') });
	const texts = () => f.evaluate(() => window.__pfx.project.getItems({ class: window.__pfx.scope.PointText }).map((t) => t.content).join(' / '));

	console.log('  form:', await text(f.locator('.form-module')));
	console.log('  card:', await texts());
	await choose(officeSel, 'Manchester');
	await page.waitForTimeout(2000);
	console.log('  manchester:', await texts());
	await full('01-customer-manchester.png');
	await choose(officeSel, 'Edinburgh');
	await page.waitForTimeout(2000);
	console.log('  edinburgh:', await texts());
	await full('05-customer-edinburgh.png');
	await ctx.close();
}

await browser.close();
