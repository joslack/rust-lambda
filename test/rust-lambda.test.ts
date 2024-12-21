import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as RustLambda from '../lib/rust-lambda-stack';

// Mock the asset handling
jest.mock('aws-cdk-lib/aws-lambda', () => {
  const original = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...original,
    Code: {
      ...original.Code,
      fromAsset: jest.fn().mockImplementation(() => ({
        bindToResource: () => {},
        bind: () => ({
          s3Location: { bucketName: 'test-bucket', objectKey: 'test-key' },
        }),
      })),
    },
  };
});

describe('RustLambdaStack', () => {
  const app = new cdk.App();
  const stack = new RustLambda.RustLambdaStack(app, 'TestRustLambdaStack');
  const template = Template.fromStack(stack);

  test('Stack synthesizes successfully', () => {
    // Validate that the stack can be synthesized
    expect(() => {
      app.synth();
    }).not.toThrow();
  });

  test('Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'provided.al2',
      Handler: 'bootstrap',
      MemorySize: 128,
      Timeout: 30,
      Environment: {
        Variables: {
          RUST_LOG: 'info'
        }
      },
      Code: Match.anyValue()
    });
  });

  test('CloudWatch Log Group Created', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 7,
      LogGroupName: Match.anyValue()
    });
  });

  test('CloudWatch Dashboard Created', () => {
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'RustLambdaMonitoring'
    });
  });

  test('Error Metric Filter Created', () => {
    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: '{ $.level = "ERROR" }',
      MetricTransformations: [
        Match.objectLike({
          MetricName: 'RustLambdaErrors',
          MetricNamespace: 'CustomMetrics'
        })
      ]
    });
  });

  test('Stack Outputs Created', () => {
    template.hasOutput('FunctionArn', Match.anyValue());
    template.hasOutput('LogGroupName', Match.anyValue());
  });

  test('Lambda has appropriate IAM role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com'
            }
          }
        ]
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              { Ref: 'AWS::Partition' },
              ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
            ]
          ]
        }
      ]
    });
  });
});
