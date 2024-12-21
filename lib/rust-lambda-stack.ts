import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class RustLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const rustFunction = new lambda.Function(this, 'RustFunction', {
      runtime: lambda.Runtime.PROVIDED_AL2,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset('rust-lambda/target/lambda/release/bootstrap.zip'),
      
      // Configure CloudWatch Logs
      logRetention: logs.RetentionDays.ONE_WEEK,
      
      // Configure environment variables for log level
      environment: {
        RUST_LOG: 'info',
      },
      
      // Configure memory and timeout
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
    });

    // Create CloudWatch Log Group with specific settings
    const logGroup = new logs.LogGroup(this, 'RustFunctionLogGroup', {
      logGroupName: `/aws/lambda/${rustFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // or RETAIN if you want to keep logs after stack deletion
    });

    // Optional: Create custom metrics and alarms
    const errorMetric = new logs.MetricFilter(this, 'ErrorMetricFilter', {
      logGroup,
      filterPattern: logs.FilterPattern.stringValue('$.level', '=', 'ERROR'),
      metricNamespace: 'CustomMetrics',
      metricName: 'RustLambdaErrors',
    });

    // Optional: Create a dashboard for monitoring
    const dashboard = new cdk.aws_cloudwatch.Dashboard(this, 'RustLambdaDashboard', {
      dashboardName: 'RustLambdaMonitoring',
    });

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.LogQueryWidget({
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          'fields @timestamp, event_id, request_id, @message',
          'sort @timestamp desc',
          'limit 20'
        ],
        width: 24,
        height: 8,
        title: 'Recent Lambda Invocations'
      })
    );

    // Output the function ARN and log group name
    new cdk.CfnOutput(this, 'FunctionArn', {
      value: rustFunction.functionArn,
      description: 'The ARN of the Rust Lambda function',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'The name of the CloudWatch Log Group',
    });
  }
}
