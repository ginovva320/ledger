import * as path from 'node:path';
import {
  CfnOutput,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

interface LedgerSiteStackProps extends StackProps {
  readonly hostedZoneId: string;
  readonly hostedZoneName: string;
  readonly subdomain: string;
}

function withoutTrailingDot(value: string): string {
  return value.replace(/\.$/, '');
}

function validateSubdomain(value: string): string {
  const subdomain = withoutTrailingDot(value.trim().toLowerCase());
  if (!/^(?!-)[a-z0-9-]+(?:\.(?!-)[a-z0-9-]+)*$/.test(subdomain)) {
    throw new Error(`Invalid LEDGER_SUBDOMAIN: ${value}`);
  }
  return subdomain;
}

export class LedgerSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: LedgerSiteStackProps) {
    super(scope, id, props);

    const hostedZoneName = withoutTrailingDot(props.hostedZoneName.trim().toLowerCase());
    const subdomain = validateSubdomain(props.subdomain);
    const domainName = `${subdomain}.${hostedZoneName}`;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: hostedZoneName,
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      certificate,
      defaultRootObject: 'index.html',
      domainNames: [domainName],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.AaaaRecord(this, 'AliasRecordIpv6', {
      zone: hostedZone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../site'))],
    });

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${domainName}`,
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });
  }
}
