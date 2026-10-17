#!/usr/bin/env node
// Validates catalog/index.json against the specs in openapi/.
// Node 22, no dependencies. Exit 0 when the index is consistent, 1 otherwise.
//
// Fails when:
//   - a spec in openapi/ has no index entry
//   - an index entry points at a file that does not exist
//   - a required field is missing or has the wrong type
//   - status is not in the allowed set
//   - ownerRepo is not one of the COPUR/fintechbankx-* repositories
//   - info.version in the index does not match the spec's info.version
//   - two entries point at the same file

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.env.CATALOG_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const INDEX = join(ROOT, 'catalog', 'index.json');
const SPEC_DIR = join(ROOT, 'openapi');

export const ALLOWED_STATUS = ['mirrored', 'drifted', 'provider-missing', 'catalog-only', 'expected'];

// The FinTechBankX repositories under COPUR (actual GitHub names, see the
// fbx-domain-map skill in the enterprise-architecture repo).
export const OWNER_REPOS = [
  'COPUR/fintechbankx-customer-profile-kyc-core',
  'COPUR/fintechbankx-governance-api-contracts-asyncapi-catalog',
  'COPUR/fintechbankx-governance-api-contracts-openapi-catalog',
  'COPUR/fintechbankx-governance-api-contracts-schema-registry',
  'COPUR/fintechbankx-governance-architecture-enablement-adr-runbooks',
  'COPUR/fintechbankx-governance-architecture-enablement-enterprise-architecture',
  'COPUR/fintechbankx-lendingpayments-loan-lifecycle-core',
  'COPUR/fintechbankx-lendingpayments-payment-orchestration-bulk-orchestration',
  'COPUR/fintechbankx-lendingpayments-payment-orchestration-initiation-settlement',
  'COPUR/fintechbankx-lendingpayments-payment-orchestration-recurring-mandates',
  'COPUR/fintechbankx-lendingpayments-payment-orchestration-request-to-pay',
  'COPUR/fintechbankx-openfinance-consent-auth-service',
  'COPUR/fintechbankx-openfinance-corporate-data-business-financial',
  'COPUR/fintechbankx-openfinance-open-data-atm-directory',
  'COPUR/fintechbankx-openfinance-open-data-products-catalog',
  'COPUR/fintechbankx-openfinance-payee-metadata-banking-metadata',
  'COPUR/fintechbankx-openfinance-payee-metadata-payee-verification',
  'COPUR/fintechbankx-openfinance-retail-data-personal-financial',
  'COPUR/fintechbankx-platform-delivery-iac-cicd-templates',
  'COPUR/fintechbankx-platform-delivery-iac-terraform-modules',
  'COPUR/fintechbankx-platform-event-streaming-kafka',
  'COPUR/fintechbankx-platform-identity-iam-keycloak-ldap',
  'COPUR/fintechbankx-platform-mesh-security-service-mesh',
  'COPUR/fintechbankx-platform-observability-sre-operations',
  'COPUR/fintechbankx-riskcompliance-compliance-evidence-core',
  'COPUR/fintechbankx-riskcompliance-risk-decisioning-core',
];

const SERVICE_ID = /^svc-[a-z]+-[a-z0-9-]+$/;
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isStrOrNull = (v) => v === null || isStr(v);

// Reads info.version from an OpenAPI YAML file without a YAML parser: the
// first indented 'version:' line inside the top-level 'info:' block.
export function readInfoVersion(text) {
  const lines = text.split(/\r?\n/);
  let inInfo = false;
  for (const line of lines) {
    if (/^info:\s*$/.test(line)) { inInfo = true; continue; }
    if (inInfo && /^\S/.test(line)) break;
    const m = inInfo && line.match(/^\s{2}version:\s*['"]?([^'"#\s]+)['"]?/);
    if (m) return m[1];
  }
  return null;
}

export function validate(index, specFiles, fileExists, readFile) {
  const errors = [];
  if (!index || !Array.isArray(index.entries)) {
    return ['catalog/index.json: "entries" must be an array'];
  }

  const seen = new Map();
  index.entries.forEach((e, i) => {
    const where = `entries[${i}]${e && isStr(e.file) ? ` (${e.file})` : e && isStr(e.serviceId) ? ` (${e.serviceId})` : ''}`;
    if (!e || typeof e !== 'object') { errors.push(`${where}: entry must be an object`); return; }

    for (const k of ['file', 'serviceId', 'ownerRepo', 'providerSpecPath', 'monolithSource', 'status', 'info', 'note']) {
      if (!(k in e)) errors.push(`${where}: missing required field "${k}"`);
    }
    if ('file' in e && !isStrOrNull(e.file)) errors.push(`${where}: "file" must be a string or null`);
    if ('serviceId' in e && !(isStr(e.serviceId) && SERVICE_ID.test(e.serviceId))) errors.push(`${where}: "serviceId" must match ${SERVICE_ID}`);
    if ('providerSpecPath' in e && !isStrOrNull(e.providerSpecPath)) errors.push(`${where}: "providerSpecPath" must be a string or null`);
    if ('monolithSource' in e && !isStrOrNull(e.monolithSource)) errors.push(`${where}: "monolithSource" must be a string or null`);
    if ('note' in e && !isStr(e.note)) errors.push(`${where}: "note" must be a non-empty string`);
    if ('info' in e && !(e.info && typeof e.info === 'object' && isStr(e.info.version))) errors.push(`${where}: "info.version" is required`);

    if ('ownerRepo' in e && !OWNER_REPOS.includes(e.ownerRepo)) {
      errors.push(`${where}: ownerRepo "${e.ownerRepo}" is not one of the COPUR/fintechbankx-* repositories`);
    }

    if ('status' in e && !ALLOWED_STATUS.includes(e.status)) {
      errors.push(`${where}: status "${e.status}" is not one of ${ALLOWED_STATUS.join(', ')}`);
    }

    if (e.status === 'expected') {
      if (e.file !== null) errors.push(`${where}: status "expected" requires "file": null`);
      if (!isStr(e.providerSpecPath)) errors.push(`${where}: status "expected" requires a providerSpecPath`);
    } else if (ALLOWED_STATUS.includes(e.status)) {
      if (!isStr(e.file)) errors.push(`${where}: status "${e.status}" requires a file`);
      if (['mirrored', 'drifted'].includes(e.status) && !isStr(e.providerSpecPath)) {
        errors.push(`${where}: status "${e.status}" requires a providerSpecPath`);
      }
      if (['provider-missing', 'catalog-only'].includes(e.status) && e.providerSpecPath !== null) {
        errors.push(`${where}: status "${e.status}" requires "providerSpecPath": null`);
      }
    }

    if (isStr(e.file)) {
      if (!/^openapi\/[^/]+\.yaml$/.test(e.file)) errors.push(`${where}: file must be openapi/<name>.yaml`);
      if (seen.has(e.file)) errors.push(`${where}: duplicate entry for ${e.file} (also entries[${seen.get(e.file)}])`);
      seen.set(e.file, i);
      if (!fileExists(e.file)) {
        errors.push(`${where}: file ${e.file} does not exist`);
      } else if (e.info && isStr(e.info.version)) {
        const v = readInfoVersion(readFile(e.file));
        if (v !== e.info.version) errors.push(`${where}: info.version "${e.info.version}" does not match spec info.version "${v}"`);
      }
    }
  });

  for (const f of specFiles) {
    if (!seen.has(f)) errors.push(`${f}: spec has no entry in catalog/index.json`);
  }
  return errors;
}

function main() {
  let index;
  try {
    index = JSON.parse(readFileSync(INDEX, 'utf8'));
  } catch (err) {
    console.error(`[catalog-index] cannot read catalog/index.json: ${err.message}`);
    process.exit(1);
  }
  const specFiles = existsSync(SPEC_DIR)
    ? readdirSync(SPEC_DIR).filter((n) => /\.ya?ml$/.test(n)).sort().map((n) => `openapi/${n}`)
    : [];
  const errors = validate(
    index,
    specFiles,
    (f) => existsSync(join(ROOT, f)),
    (f) => readFileSync(join(ROOT, f), 'utf8'),
  );

  if (errors.length) {
    for (const e of errors) console.error(`[catalog-index] ${e}`);
    console.error(`[catalog-index] FAILED: ${errors.length} problem(s)`);
    process.exit(1);
  }
  const counts = {};
  for (const e of index.entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
  const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`[catalog-index] OK: ${specFiles.length} spec(s) in openapi/, ${index.entries.length} index entries (${summary})`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
