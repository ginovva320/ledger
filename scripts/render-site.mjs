import 'dotenv/config';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function withoutTrailingDot(value) {
  return value.replace(/\.$/, '');
}

const hostedZoneName = withoutTrailingDot(requiredEnv('LEDGER_HOSTED_ZONE_NAME').toLowerCase());
const subdomain = withoutTrailingDot(requiredEnv('LEDGER_SUBDOMAIN').toLowerCase());
const siteUrl = `https://${subdomain}.${hostedZoneName}`;
const sourceDir = resolve('site');
const outputDir = resolve('.site-dist');
const indexPath = resolve(outputDir, 'index.html');

rmSync(outputDir, { force: true, recursive: true });
cpSync(sourceDir, outputDir, { recursive: true });

const index = readFileSync(indexPath, 'utf8');
writeFileSync(indexPath, index.replaceAll('__LEDGER_SITE_URL__', siteUrl));

console.log(`Rendered static site for ${siteUrl}`);
