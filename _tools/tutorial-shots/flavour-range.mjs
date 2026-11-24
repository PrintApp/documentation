// Tutorial screenshots: the sorbet label range (pictures and colours picked by a field), from a local
// editor through the save-blocking harness (see README.md).
// PORT=3012 OUT=<dir> node flavour-range.mjs [admin|customer|all]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1055/chrome-win/chrome.exe';
const DK = 'dom_a8e9c6f48750bff0770dbb73c94f0c67';
const DESIGN = 'design_01M86CX4EX2VSKJ4JE4D22VEPV';
const PORT = process.env.PORT || '3012';
const BASE = `http://localhost:${PORT}/pfx/_tut-harness.html?embed=1&dk=${DK}&design=${DESIGN}`;
const OUT = process.env.OUT || 'C:/werks/pa/documentation/images/tutorials/flavour-range/';
const which = process.argv[2] || 'all';
fs.mkdirSync(OUT, { recursive: true });

const IDS = { frame: 'it_q3ml3qoza', name: 'it_u0qu1pbbw', band: 'it_q3lk2kei0' };

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
const select = (f, id) => f.evaluate((id) => window.__pfx.execute({ op: 'selection.set', target: [id] }), id);
const tab = async (f, id) => { await click(f.locator(`.sidebar .tabs button[data-cmd=tab][data-id=${id}]`)); await f.waitForTimeout(700); };
const text = (loc) => loc.first().innerText().then((t) => t.replace(/\s*\n\s*/g, ' | ').slice(0, 400)).catch(() => '(none)');

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

if (which === 'all' || which === 'admin') {
	console.log('admin');
	const { ctx, page, f } = await boot(true);

	const openField = async (title, name) => {
		await tab(f, 'design');
		if (!(await f.locator('.data-sources .ds-head.open').count())) await click(f.locator('.data-sources [data-cmd=toggle]'));
		await f.waitForTimeout(600);
		await click(f.locator('.data-sources button.ds-row', { hasText: title }));
		await f.waitForSelector('.data-panel', { timeout: 10000 });
		await f.waitForTimeout(900);
		console.log(`  ${title}:`, await text(f.locator('.data-panel')));
		await shotPanel(page, f, name, '.data-panel .dp-body > *');
		await closePanel(f);
	};
	await openField('Flavour', '02-field-flavour.png');

	const aspect = async (id, which, name) => {
		await select(f, id);
		await tab(f, 'item');
		await click(f.locator(`button[data-aspect=${which}]`));
		await f.waitForSelector('.data-panel', { timeout: 10000 });
		await f.waitForTimeout(900);
		console.log(`  ${which} ${name}:`, await text(f.locator('.data-panel')));
		await shotPanel(page, f, name, '.data-panel .dp-body > *');
		await closePanel(f);
	};
	await aspect(IDS.frame, 'content', '03-frame-content.png');
	await aspect(IDS.name, 'color', '04-colour-picked.png');

	// the name's Data lines: content and colour both follow Flavour
	await select(f, IDS.name);
	await tab(f, 'item');
	const dataSec = f.locator('.form-section', { has: f.locator('button[data-aspect]') });
	console.log('  data:', await text(dataSec));
	await shotEl(dataSec, '05-object-data.png', 14);
	await ctx.close();
}

if (which === 'all' || which === 'customer') {
	console.log('customer');
	const { ctx, page, f } = await boot(false);
	const full = async (name) => { await page.screenshot({ path: OUT + name }); console.log('  wrote', name); };
	const tick = (label) => f.locator('.form-module .form-item', { hasText: label }).locator('input[type=checkbox]').first().evaluate((el) => el.click());
	const pick = (v) => f.locator('.form-module select').first().evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
	const visible = () => f.evaluate(() => window.__pfx.project.getItems({ class: window.__pfx.scope.PointText }).filter((t) => t.visible).map((t) => t.content).join(' / '));

	await pick('Blueberry');
	await page.waitForTimeout(2500);
	console.log('  label 1:', await visible());
	await full('01-customer-blueberry.png');
	await pick('Mint');
	await page.waitForTimeout(2500);
	console.log('  label 2:', await visible());
	await full('06-customer-mint.png');
	await ctx.close();
}

await browser.close();
