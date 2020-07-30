import axios from 'axios';
import {Callback, Context, SNSEvent} from "aws-lambda";
import {SNSEventRecord} from "aws-lambda/trigger/sns";
import {WebAPICallResult} from "@slack/web-api";
import {ChatPostMessageArguments} from "@slack/web-api/dist/methods";

const {WebClient} = require('@slack/web-api');

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

const sendMessage = (message: ChatPostMessageArguments) => {

    web.chat.postMessage(message)
        .then((response: WebAPICallResult) => {
            if (response.ok) {
                return {};
            } else {
                throw new Error(response.error);
            }
        });
};

const processRecord = (record: SNSEventRecord) => {
    const subject = record.Sns.Subject;
    const message = JSON.parse(record.Sns.Message);
    return sendMessage({
        text: subject,
        channel: process.env.SLACK_CHANNEL || '',
        attachments: [{
            text: message.NewStateReason,
            fields: [{
                title: 'Time',
                value: message.StateChangeTime,
                short: true,
            }, {
                title: 'Alarm',
                value: message.AlarmName,
                short: true,
            }, {
                title: 'Account',
                value: message.AWSAccountId,
                short: true,
            }, {
                title: 'Region',
                value: message.Region,
                short: true,
            }],
        }],
    });
};

/*
example event:
{
  "Records": [{
     "EventSource": "aws:sns",
     "EventVersion": "1.0",
     "EventSubscriptionArn": "arn:aws:sns:us-east-1:XXX:cw-to-slack-Topic-1B8S548158492:a0e76b10-796e-471d-82d3-0510fc89ad93",
     "Sns": {
        "Type": "Notification",
        "MessageId": "[...]",
        "TopicArn": "arn:aws:sns:us-east-1:XXX:cw-to-slack-Topic-1B8S548158492",
        "Subject": "ALARM: \"cw-to-slack-Alarm-9THDKWBS1876\" in US East (N. Virginia)",
        "Message": "{\"AlarmName\":\"cw-to-slack-Alarm-9THDKWBS1876\",\"AlarmDescription\":null,\"AWSAccountId\":\"XXX\",\"NewStateValue\":\"ALARM\",\"NewStateReason\":\"Threshold Crossed: 1 datapoint [3.22 (29/10/17 13:20:00)] was greater than the threshold (1.0).\",\"StateChangeTime\":\"2017-10-30T13:20:35.831+0000\",\"Region\":\"US East (N. Virginia)\",\"OldStateValue\":\"INSUFFICIENT_DATA\",\"Trigger\":{\"MetricName\":\"EstimatedCharges\",\"Namespace\":\"AWS/Billing\",\"StatisticType\":\"Statistic\",\"Statistic\":\"MAXIMUM\",\"Unit\":null,\"Dimensions\":[{\"name\":\"Currency\",\"value\":\"USD\"}],\"Period\":86400,\"EvaluationPeriods\":1,\"ComparisonOperator\":\"GreaterThanThreshold\",\"Threshold\":1.0,\"TreatMissingData\":\"\",\"EvaluateLowSampleCountPercentile\":\"\"}}",
        "Timestamp": "2017-10-30T13:20:35.855Z",
        "SignatureVersion": "1",
        "Signature": "[...]",
        "SigningCertUrl": "[...]",
        "UnsubscribeUrl": "[...]",
        "MessageAttributes": {}
     }
  }]
}
*/
exports.event = (event: SNSEvent, context: Context, cb: Callback) => {
    Promise.all(event.Records.map(processRecord))
        .then(() => cb(null))
        .catch((err) => cb(err));
};