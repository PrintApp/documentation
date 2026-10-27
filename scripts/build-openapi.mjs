// Build openapi.json (the API Reference tab) and the endpoint pages from the Print.App
// API v2 sources, which live with the code and are tested there:
//   - printapp-api/api/routes.mjs       every operation: method, path, parameters, request
//                                        and response schema, success status, doc text
//   - printapp-api/api/schemas/*.json   request and response schemas (tested against what
//                                        the handlers accept and return)
//   - printapp-api/designer/schemas/ops.schema.json   the design operations (DesignOp…)
// Each schema is embedded as components.schemas.<title>; `$ref: "<$id>"` between them
// becomes `#/components/schemas/<Title>`.
//
//   node scripts/build-openapi.mjs
//
// Writes openapi.json and api-reference/v2/<group>/<page>.mdx for every operation, and
// the Endpoints navigation for docs.json / mint.json to scripts/endpoints-nav.json.
// Expects printapp-api to be a sibling of this repo; override with
// PRINTAPP_API=/abs/path/to/printapp-api. Re-run whenever the API changes, and commit
// the output. Do not hand-edit openapi.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const API_ROOT = process.env.PRINTAPP_API || path.resolve(REPO_ROOT, '..', 'printapp-api');
const SCHEMA_DIR = path.join(API_ROOT, 'api', 'schemas');
const OPS_SCHEMA = path.join(API_ROOT, 'designer', 'schemas', 'ops.schema.json');
const OUT = path.resolve(REPO_ROOT, 'openapi.json');
const PAGES = path.resolve(REPO_ROOT, 'api-reference', 'v2');

for (const needed of [SCHEMA_DIR, OPS_SCHEMA, path.join(API_ROOT, 'api', 'routes.mjs')]) {
  if (!fs.existsSync(needed)) {
    console.error(`Not found: ${needed}\nSet PRINTAPP_API to the printapp-api checkout and retry.`);
    process.exit(1);
  }
}
const { operations, tags } = await import(pathToFileURL(path.join(API_ROOT, 'api', 'routes.mjs')).href);

// ---- schemas -------------------------------------------------------------

const loaded = fs.readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8')));
const nameOf = Object.fromEntries(loaded.map(s => [s.$id, s.title]));

// the design operations: designer definitions → DesignOp… components
const ops = JSON.parse(fs.readFileSync(OPS_SCHEMA, 'utf8'));
const pascal = text => text.split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
const opName = key => key.startsWith('op:') ? `DesignOp${pascal(key.slice(3))}` : `DesignOpPart${pascal(key)}`;

const rewriteRefs = node => {
  if (Array.isArray(node)) return node.forEach(rewriteRefs);
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      const def = /^#\/definitions\/(.+)$/.exec(value);
      if (def) node[key] = `#/components/schemas/${opName(def[1])}`;
      else if (nameOf[value]) node[key] = `#/components/schemas/${nameOf[value]}`;
    } else rewriteRefs(value);
  }
};

const schemas = {};
for (const schema of loaded) {
  const { $id, $schema, ...rest } = structuredClone(schema);
  rewriteRefs(rest);
  schemas[schema.title] = rest;
}
const opKeys = Object.keys(ops.definitions).filter(k => k.startsWith('op:'));
for (const [key, def] of Object.entries(ops.definitions)) {
  const copy = structuredClone(def);
  rewriteRefs(copy);
  schemas[opName(key)] = key.startsWith('op:') ? { title: key.slice(3), ...copy } : copy;
}
// the batch's ops are any of the design operations
schemas.OpsBatch.properties.ops.items = { oneOf: opKeys.map(k => ({ $ref: `#/components/schemas/${opName(k)}` })), discriminator: { propertyName: 'op' } };

for (const op of operations) {
  if (op.body && !nameOf[op.body]) throw new Error(`${op.id}: request schema ${op.body} missing`);
  if (!nameOf[op.response]) throw new Error(`${op.id}: response schema ${op.response} missing`);
}

// ---- responses -------------------------------------------------------------

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const exampleOf = name => schemas[name]?.examples?.[0];
const body = (name, example = exampleOf(name)) => ({ 'application/json': { schema: ref(name), ...(example && { example }) } });
const withRequestId = { 'x-request-id': { $ref: '#/components/headers/RequestId' } };
const fail = (description, example) => ({ description, headers: withRequestId, content: body('Error', example) });
const errorExample = (code, message, param) => ({ error: true, code, message, ...(param && { param }), requestId: 'FZn-uhymjoEEJow=' });

const listExample = item => ({ object: 'list', data: [exampleOf(item)].filter(Boolean), hasMore: false, nextCursor: null });
const okResponse = op => {
  const name = nameOf[op.response];
  const item = name.endsWith('List') ? name.slice(0, -4) : null;
  const example = item ? listExample(item) : exampleOf(name);
  const headers = op.idempotent ? { ...withRequestId, 'idempotent-replayed': { $ref: '#/components/headers/IdempotentReplayed' } } : withRequestId;
  return { description: op.status === 201 ? 'Created.' : 'OK.', headers, content: body(name, example) };
};

const ERRORS = {
  400: () => fail('A parameter or body field is malformed: `param` names it and `details` lists every problem found.', errorExample('invalid_request', 'width is required.', 'width')),
  404: () => fail("Not found in your account. Another account's resources answer 404 too.", errorExample('not_found', 'Not found.')),
  409: () => fail('The request conflicts with the current state; `code` says how (`folder_not_empty`, `builtin_folder`, `builtin_palette`, `editor_not_supported`, `design_changed`, `idempotency_key_reused`, `idempotency_in_progress`).', errorExample('folder_not_empty', 'The folder still holds designs. Remove them from it (or delete them) first.')),
  413: () => fail('A body or a downloaded file is over its size limit.', errorExample('payload_too_large', 'The file at url is larger than 50 MB.', 'url')),
  422: () => fail("An operation failed while the batch ran. Nothing was saved; `details` holds every operation's result.", { ...errorExample('ops_failed', "ops[1] (item.update) failed: no item 'logo'. Nothing was saved.", 'ops'), details: [{ index: 0, op: 'text.add', ok: true, id: 'itm_7f3b', ref: 'name' }, { index: 1, op: 'item.update', ok: false, error: "no item 'logo'" }] }),
};
const common = {
  '401': fail('Missing, unknown, revoked or expired secret key.', errorExample('unauthorized', 'Missing or invalid secret key. Send it as "Authorization: Bearer sk_…".')),
  '403': fail('The account is suspended for an unpaid invoice.', errorExample('account_suspended', 'This account is suspended. Settle the outstanding invoice in the Print.App dashboard.')),
  '429': {
    description: 'Rate limited by the API gateway. Back off and retry. This response comes from the gateway, so its body is `{ "message": "Too Many Requests" }`, not the standard error.',
    content: { 'application/json': { schema: ref('GatewayError'), example: { message: 'Too Many Requests' } } },
  },
  '500': fail('Something failed on our side. Retry; quote the requestId to support if it persists.', errorExample('internal_error', 'Something went wrong on our side. Retry the request; if it keeps failing, contact support with the requestId.')),
};
const withBody = { '415': fail('The body is not JSON.', errorExample('unsupported_media_type', 'Send the request body as JSON, with "Content-Type: application/json".')) };

// ---- paths ---------------------------------------------------------------

const paths = {};
for (const op of operations) {
  const bodyName = op.body && nameOf[op.body];
  const errors = Object.fromEntries((op.errors || []).map(status => [String(status), ERRORS[status]()]));
  paths[op.path] ??= {};
  paths[op.path][op.method.toLowerCase()] = {
    tags: [op.tag],
    operationId: op.id,
    summary: op.summary,
    description: op.description,
    parameters: [...(op.params || []), ...(op.query || []).map(q => ({ required: false, ...q })), ...(op.idempotent ? [{ $ref: '#/components/parameters/IdempotencyKey' }] : [])],
    ...(bodyName && { requestBody: { required: true, content: body(bodyName) } }),
    responses: { [String(op.status || 200)]: okResponse(op), ...errors, ...(bodyName ? withBody : {}), ...common },
  };
}

// ---- the document ----------------------------------------------------------

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Print.App API',
    version: '2.1.0',
    description: 'Server-to-server API for Print.App integrations: designs and their page content, folders, files, fonts, palettes, product assignments, projects and editor links. Authenticate every request with a secret key: `Authorization: Bearer sk_…`. Never call it from a browser.',
  },
  servers: [{ url: 'https://api.print.app', description: 'Production' }],
  security: [{ bearerAuth: [] }],
  tags,
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'A secret key from Print.App admin → Domains → Secret keys, sent as `Authorization: Bearer sk_…`. Server-side only.',
      },
    },
    parameters: {
      IdempotencyKey: {
        name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', minLength: 1, maxLength: 255 },
        description: 'Makes a retry safe: a second request with the same key and the same body gets the first response back (for 24 hours) instead of creating the resource again. Use a new key, such as a UUID, for every new request.',
      },
    },
    headers: {
      RequestId: { description: 'Identifies the request. Quote it when contacting support.', schema: { type: 'string' } },
      IdempotentReplayed: { description: '`true` when the response is the stored answer to an earlier request with the same Idempotency-Key.', schema: { type: 'string' } },
    },
    schemas: {
      ...schemas,
      GatewayError: { type: 'object', properties: { message: { type: 'string' } }, description: 'Returned by the API gateway itself (429).' },
    },
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`wrote ${OUT} (${fs.statSync(OUT).size} bytes, ${operations.length} operations, ${Object.keys(spec.components.schemas).length} schemas)`);

// ---- endpoint pages ----------------------------------------------------------

// The pages that existed before 2.1 keep their URLs
const KEPT = { getAccount: 'account/get', listProjects: 'projects/list', getProject: 'projects/get', listDesigns: 'designs/list', getDesign: 'designs/get' };
const kebab = text => text.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
const pageOf = op => KEPT[op.id] || `${kebab(op.tag)}/${kebab(op.id)}`;

const groups = new Map(tags.map(t => [t.name, []]));
for (const op of operations) {
  const page = pageOf(op);
  const file = path.join(PAGES, `${page}.mdx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\ntitle: "${op.summary}"\nopenapi: "/openapi.json ${op.method} ${op.path}"\n---\n`);
  groups.get(op.tag).push(`api-reference/v2/${page}`);
}
const nav = [...groups].filter(([, pages]) => pages.length).map(([group, pages]) => ({ group, pages }));
fs.writeFileSync(path.join(HERE, 'endpoints-nav.json'), `${JSON.stringify(nav, null, 2)}\n`);
console.log(`wrote ${operations.length} endpoint pages; navigation in scripts/endpoints-nav.json`);
