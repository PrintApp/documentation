// Build openapi.json (the API Reference tab) from the Print.App API v2 response schemas.
//
// The schemas live with the code, in printapp-api/api/schemas, and are tested there
// against what the handlers actually return, so the reference can't drift from the API.
// Each schema is embedded verbatim as components.schemas.<title>; `$ref: "<$id>"` between
// them becomes `#/components/schemas/<Title>`. Paths, parameters and status codes are
// declared below.
//
//   node scripts/build-openapi.mjs
//
// Expects printapp-api to be a sibling of this repo; override with
// PRINTAPP_API_SCHEMAS=/abs/path/to/printapp-api/api/schemas. Re-run whenever the
// schemas or endpoints change, and commit openapi.json. Do not hand-edit it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const SCHEMA_DIR = process.env.PRINTAPP_API_SCHEMAS || path.resolve(REPO_ROOT, '..', 'printapp-api', 'api', 'schemas');
const OUT = path.resolve(REPO_ROOT, 'openapi.json');

if (!fs.existsSync(SCHEMA_DIR)) {
  console.error(`Schema directory not found: ${SCHEMA_DIR}`);
  console.error('Set PRINTAPP_API_SCHEMAS to printapp-api/api/schemas and retry.');
  process.exit(1);
}

// ---- schemas -------------------------------------------------------------

const loaded = fs.readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8')));
const nameOf = Object.fromEntries(loaded.map(s => [s.$id, s.title]));

const rewriteRefs = node => {
  if (Array.isArray(node)) return node.forEach(rewriteRefs);
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && nameOf[value]) node[key] = `#/components/schemas/${nameOf[value]}`;
    else rewriteRefs(value);
  }
};

const schemas = {};
for (const schema of loaded) {
  const { $id, $schema, ...rest } = schema;
  rewriteRefs(rest);
  schemas[schema.title] = rest;
}
for (const needed of ['Account', 'Project', 'ProjectList', 'Error'])
  if (!schemas[needed]) throw new Error(`schema "${needed}" missing from ${SCHEMA_DIR}`);

// ---- responses -------------------------------------------------------------

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const exampleOf = name => schemas[name].examples?.[0];
const body = (name, example = exampleOf(name)) => ({ 'application/json': { schema: ref(name), ...(example && { example }) } });
const withRequestId = { 'x-request-id': { $ref: '#/components/headers/RequestId' } };

const ok = (name, description) => ({ description, headers: withRequestId, content: body(name) });
const fail = (description, example) => ({ description, headers: withRequestId, content: body('Error', example) });
const errorExample = (code, message, param) => ({ error: true, code, message, ...(param && { param }), requestId: 'FZn-uhymjoEEJow=' });

const common = {
  '401': fail('Missing, unknown, revoked or expired secret key.', errorExample('unauthorized', 'Missing or invalid secret key. Send it as "Authorization: Bearer sk_…".')),
  '403': fail('The account is suspended for an unpaid invoice.', errorExample('account_suspended', 'This account is suspended. Settle the outstanding invoice in the Print.App dashboard.')),
  '429': {
    description: 'Rate limited by the API gateway. Back off and retry. This response comes from the gateway, so its body is `{ "message": "Too Many Requests" }`, not the standard error.',
    content: { 'application/json': { schema: ref('GatewayError'), example: { message: 'Too Many Requests' } } },
  },
  '500': fail('Something failed on our side. Retry; quote the requestId to support if it persists.', errorExample('internal_error', 'Something went wrong on our side. Retry the request; if it keeps failing, contact support with the requestId.')),
};

// ---- the document ----------------------------------------------------------

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Print.App API',
    version: '2.0.0',
    description: 'Server-to-server API for Print.App integrations. Authenticate every request with a secret key: `Authorization: Bearer sk_…`. Never call it from a browser.',
  },
  servers: [{ url: 'https://api.print.app', description: 'Production' }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Account', description: 'The account a secret key belongs to.' },
    { name: 'Projects', description: "Your customers' saved designs." },
  ],
  paths: {
    '/v2/account': {
      get: {
        tags: ['Account'],
        operationId: 'getAccount',
        summary: 'Get the account',
        description: 'Returns the account (domain) the secret key belongs to. The quickest way to check a key works.',
        responses: { '200': ok('Account', 'The account.'), ...common },
      },
    },
    '/v2/projects': {
      get: {
        tags: ['Projects'],
        operationId: 'listProjects',
        summary: 'List projects',
        description: "Lists your account's projects, most recently modified first. Page through them with `cursor`.",
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Projects per page.' },
          { name: 'cursor', in: 'query', required: false, schema: { type: 'string' }, description: 'The `nextCursor` of the previous page. Keep the other parameters the same between pages.' },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['draft', 'saved', 'submitted'] }, description: 'Only projects with this status.' },
          { name: 'modifiedFrom', in: 'query', required: false, schema: { type: 'string' }, description: 'Only projects last saved at or after this time: ISO-8601 (`2026-10-01T00:00:00Z`) or epoch milliseconds.' },
          { name: 'modifiedTo', in: 'query', required: false, schema: { type: 'string' }, description: 'Only projects last saved at or before this time: ISO-8601 or epoch milliseconds.' },
        ],
        responses: {
          '200': {
            description: 'A page of projects.',
            headers: withRequestId,
            content: body('ProjectList', { object: 'list', data: [exampleOf('Project')], hasMore: true, nextCursor: 'eyJkb21haW5JZHgiOi…' }),
          },
          '400': fail('A parameter is malformed; `param` names it.', errorExample('invalid_request', 'limit must be an integer from 1 to 100.', 'limit')),
          ...common,
        },
      },
    },
    '/v2/projects/{id}': {
      get: {
        tags: ['Projects'],
        operationId: 'getProject',
        summary: 'Get a project',
        description: "Returns one of your account's projects. A project that belongs to another account answers 404, exactly like one that doesn't exist, so a 200 proves the project is yours.",
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'The `projectId` from the editor\'s `app:saved` event.' },
        ],
        responses: {
          '200': ok('Project', 'The project.'),
          '404': fail('No such project in your account.', errorExample('not_found', 'Project not found.')),
          ...common,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'A secret key from Print.App admin → Domains → Secret keys, sent as `Authorization: Bearer sk_…`. Server-side only.',
      },
    },
    headers: {
      RequestId: { description: 'Identifies the request. Quote it when contacting support.', schema: { type: 'string' } },
    },
    schemas: {
      ...schemas,
      GatewayError: { type: 'object', properties: { message: { type: 'string' } }, description: 'Returned by the API gateway itself (429).' },
    },
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`wrote ${OUT} (${fs.statSync(OUT).size} bytes, ${Object.keys(spec.paths).length} paths, ${Object.keys(spec.components.schemas).length} schemas)`);
