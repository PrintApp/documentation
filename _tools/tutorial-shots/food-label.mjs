// Tutorial screenshots: the food label, from the local editor (save-blocking harness).
// PORT=3013 OUT=<dir> node shoot.mjs [admin|customer|all]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1055/chrome-win/chrome.exe';
const DK = 'dom_a8e9c6f48750bff0770dbb73c94f0c67';
const DESIGN = 'design_01M866EA8QRD542KP2P7MA51DP';
const PORT = process.env.PORT || '3013';
const BASE = `http://localhost:${PORT}/pfx/_tut-harness.html?embed=1&dk=${DK}&design=${DESIGN}`;
const OUT = process.env.OUT || 'C:/werks/pa/_docs-datasources/images/tutorials/food-label/';
const which = process.argv[2] || 'all';
fs.mkdirSync(OUT, { recursive: true });

const IDS = { nuts: 'it_2nedi6renn', batch: 'it_2nee79p1od', barcode: 'it_2neegacc8x' };

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
const text = (loc) => loc.first().innerText().then((t) => t.replace(/\s*\n\s*/g, ' | ').slice(0, 500)).catch(() => '(none)');

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
	const frameEl = await page.locator('iframe').boundingBox();
	// element boxes from a frame locator are already page coordinates
	await page.screenshot({ path: OUT + name, clip: { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 } });
	console.log('  wrote', name);
	void frameEl;
}
const closePanel = async (f) => { const b = f.locator('.data-panel [data-cmd=close]'); if (await b.count()) { await click(b); await f.waitForTimeout(500); } };

if (which === 'all' || which === 'admin') {
	console.log('admin');
	const { ctx, page, f } = await boot(true);

	// Data Sources, open
	await tab(f, 'design');
	if (!(await f.locator('.data-sources .ds-head.open').count())) await click(f.locator('.data-sources [data-cmd=toggle]'));
	await f.waitForTimeout(800);
	const ds = f.locator('.form-section.data-sources');
	console.log('  ds:', await text(ds));
	await shotEl(ds, '02-data-sources.png', 14);

	const openField = async (title, name) => {
		await tab(f, 'design');
		await click(f.locator('.data-sources button.ds-row', { hasText: title }));
		await f.waitForSelector('.data-panel', { timeout: 10000 });
		await f.waitForTimeout(900);
		console.log(`  ${title}:`, await text(f.locator('.data-panel')));
		await shotPanel(page, f, name, '.data-panel .dp-body > *');
		await closePanel(f);
	};
	await openField('Product name', '03-field-product-name.png');
	await openField('Packed on', '04-field-packed-on.png');
	await openField('Best before', '05-field-best-before.png');
	await openField('Contains nuts', '08-field-contains-nuts.png');

	// the barcode: its settings, and Content → Customer fills it in
	await select(f, IDS.barcode);
	await tab(f, 'item');
	const bcSec = f.locator('.form-section', { has: f.locator('.form-section-label', { hasText: /^Barcode$/ }) });
	console.log('  barcode section:', await text(bcSec));
	await shotEl(bcSec, '06-barcode-settings.png', 14);
	const dataSec = f.locator('.form-section', { has: f.locator('button[data-aspect]') });
	console.log('  barcode data:', await text(dataSec));
	await shotEl(dataSec, '07a-barcode-data.png', 14);
	await click(f.locator('button[data-aspect=content]'));
	await f.waitForSelector('.data-panel', { timeout: 10000 });
	await f.waitForTimeout(900);
	console.log('  barcode content:', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '07b-barcode-content.png', '.data-panel .dp-body > *');
	await closePanel(f);

	// Shows panels
	const shows = async (id, name) => {
		await select(f, id);
		await tab(f, 'item');
		await click(f.locator('button[data-aspect=shows]'));
		await f.waitForSelector('.data-panel', { timeout: 10000 });
		await f.waitForTimeout(900);
		console.log(`  shows ${name}:`, await text(f.locator('.data-panel')));
		await shotPanel(page, f, name, '.data-panel .dp-body > *');
		await closePanel(f);
	};
	await shows(IDS.nuts, '09-shows-nuts.png');
	await shows(IDS.batch, '10-shows-batch.png');
	await ctx.close();
}

if (which === 'all' || which === 'customer') {
	console.log('customer');
	const { ctx, page, f } = await boot(false);
	const full = async (name) => { await page.screenshot({ path: OUT + name }); console.log('  wrote', name); };
	const setVal = (sel, v) => f.locator(sel).first().evaluate((el, v) => {
		el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
	}, v);
	console.log('  form:', await text(f.locator('.form-module')));
	await full('01-customer.png');

	// a new packing date: best before follows
	await setVal('input[type=date]', '2027-03-01');
	await page.waitForTimeout(1500);
	// contains nuts: the warning appears
	await f.locator('.form-module .form-item', { hasText: 'Contains nuts' }).locator('input[type=checkbox]').first().evaluate((el) => el.click());
	await page.waitForTimeout(1500);
	console.log('  texts:', await f.evaluate(() => window.__pfx.project.getItems({ class: window.__pfx.scope.PointText }).filter((t) => t.visible).map((t) => t.content).join(' / ')));
	await full('11-customer-filled.png');

	// a wrong check digit
	await setVal('input[data-cmd=barcode]', '2001234567890');
	await page.waitForTimeout(1500);
	const bc = f.locator('input[data-cmd=barcode]').locator('xpath=ancestor::section[contains(@class,"form-section")][1]');
	console.log('  barcode box:', await text(bc));
	await shotEl(bc, '12-customer-barcode-check.png', 6);
	await ctx.close();
}

await browser.close();
