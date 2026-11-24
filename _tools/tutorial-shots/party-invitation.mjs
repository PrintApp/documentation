// Tutorial screenshots: the party invitation (one colour field paints many items), from a local
// editor through the save-blocking harness (see README.md).
// PORT=3012 OUT=<dir> node party-invitation.mjs [admin|customer|all]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1055/chrome-win/chrome.exe';
const DK = 'dom_a8e9c6f48750bff0770dbb73c94f0c67';
const DESIGN = 'design_01M86FEFSTMHJHWMZMTXGEHKFM';
const PORT = process.env.PORT || '3012';
const BASE = `http://localhost:${PORT}/pfx/_tut-harness.html?embed=1&dk=${DK}&design=${DESIGN}`;
const OUT = process.env.OUT || 'C:/werks/pa/documentation/images/tutorials/party-invitation/';
const which = process.argv[2] || 'all';
fs.mkdirSync(OUT, { recursive: true });

const IDS = { sun: 'it_2bjqm20nef', band: 'it_2bjssb4kav', name: 'it_2bjro8ntar', rsvp: 'it_2bjstcd7wh' };

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
const text = (loc) => loc.first().innerText().then((t) => t.replace(/\s*\n\s*/g, ' | ').slice(0, 600)).catch(() => '(none)');

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

if (which === 'all' || which === 'admin') {
	console.log('admin');
	const { ctx, page, f } = await boot(true);

	await openSources(f);
	console.log('  sources:', await text(f.locator('.data-sources')));

	const dataSec = f.locator('.form-section', { has: f.locator('button[data-aspect]') });

	// the first item: a colour field is born from an item's Colour (Add a field makes no colour fields).
	// Unbind the band here only (nothing saves), so its panel looks as it does the first time.
	await f.evaluate((id) => window.__pfx.execute({ op: 'fields.bindColor', target: id, fill: null }), IDS.band);
	await select(f, IDS.band);
	await tab(f, 'item');
	console.log('  band data (unbound):', await text(dataSec));
	await click(f.locator('button[data-aspect=color]'));
	await f.waitForSelector('.data-panel', { timeout: 10000 });
	await f.waitForTimeout(800);
	console.log('  band colour (fixed):', await text(f.locator('.data-panel')));
	await click(f.locator('.data-panel button[data-cmd=color][data-choice=field]'));
	await f.waitForTimeout(600);
	const newBox = f.locator('.data-panel input[placeholder^="e.g."]').first();
	await newBox.evaluate((el) => { el.value = 'Theme colour'; el.dispatchEvent(new Event('input', { bubbles: true })); });
	await f.waitForTimeout(300);
	console.log('  band colour (new field):', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '02-new-colour-field.png', '.data-panel .dp-body > *');
	await newBox.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
	await f.waitForTimeout(800);
	console.log('  band binding now:', await f.evaluate((id) => JSON.stringify(window.__pfx.project.getItems({}).find((i) => i.data?.printfx?.id === id)?.data?.printfx?.colorFields), IDS.band));
	await closePanel(f);

	// the field: its palette
	await openSources(f);
	await click(f.locator('.data-sources button.ds-row', { hasText: 'Theme colour' }));
	await f.waitForSelector('.data-panel', { timeout: 10000 });
	await f.waitForTimeout(900);
	console.log('  Theme colour:', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '03-field-palette.png', '.data-panel .dp-body > *');
	await closePanel(f);

	// the next items: A colour field → Field: Theme colour
	await select(f, IDS.sun);
	await tab(f, 'item');
	console.log('  sun data:', await text(dataSec));
	await click(f.locator('button[data-aspect=color]'));
	await f.waitForSelector('.data-panel', { timeout: 10000 });
	await f.waitForTimeout(900);
	console.log('  sun colour:', await text(f.locator('.data-panel')));
	await shotPanel(page, f, '04-item-colour.png', '.data-panel .dp-body > *');
	await closePanel(f);

	// the name: content from tokens, colour from the field
	await select(f, IDS.name);
	await tab(f, 'item');
	console.log('  name data:', await text(dataSec));
	await shotEl(dataSec, '05-object-data.png', 14);

	await openSources(f);
	console.log('  sources after:', await text(f.locator('.data-sources')));
	await ctx.close();
}

if (which === 'all' || which === 'customer') {
	console.log('customer');
	const { ctx, page, f } = await boot(false);
	const full = async (name) => { await page.screenshot({ path: OUT + name }); console.log('  wrote', name); };
	const swatch = (name) => click(f.locator(`.form-module button[title="${name}"]`));
	const colours = () => f.evaluate(() => window.__pfx.project.getItems({}).filter((i) => i.data?.printfx?.colorFields).map((i) => i.fillColor?.toCSS(true)).join(' '));
	const colSec = f.locator('.form-module .form-section.item', { has: f.locator('button[title="Ocean"]') });

	console.log('  form:', await text(f.locator('.form-module')));
	await swatch('Ocean');
	await page.waitForTimeout(2000);
	console.log('  ocean:', await colours());
	await full('01-customer-ocean.png');
	await swatch('Grape');
	await page.waitForTimeout(2000);
	await full('06-customer-grape.png');
	await swatch('Sunshine');
	await page.waitForTimeout(2000);
	console.log('  sunshine:', await colours());
	console.log('  colour section:', await text(colSec));
	await shotEl(colSec, '07-contrast-warning.png', 10);
	await ctx.close();
}

await browser.close();
