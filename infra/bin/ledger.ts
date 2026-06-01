#!/usr/bin/env node
import 'dotenv/config';
import { App } from 'aws-cdk-lib';
import { LedgerSiteStack } from '../lib/ledger-site-stack';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const app = new App();
const stackName = process.env.LEDGER_STACK_NAME?.trim() || 'LedgerSiteStack';

new LedgerSiteStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // CloudFront viewer certificates must be created in us-east-1.
    region: 'us-east-1',
  },
  hostedZoneId: requiredEnv('LEDGER_HOSTED_ZONE_ID'),
  hostedZoneName: requiredEnv('LEDGER_HOSTED_ZONE_NAME'),
  subdomain: requiredEnv('LEDGER_SUBDOMAIN'),
});
