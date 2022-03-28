const uuid = require('../util/uuid'),
    log = require('../logger').logger(module.filename),
    {PutItemCommand, DynamoDBClient} = require("@aws-sdk/client-dynamodb"),
    {performance} = require('perf_hooks'),
    Properties = require("../util/properties");

const dynamoClient = new DynamoDBClient({region: Properties.region})

module.exports = {

    /**
     * Saves the event to the kahula-events table in Dynamo
     *
     * @param event the event to persist
     * @returns {Promise<PutItemOutput & MetadataBearer>}
     */
    async save(event) {

        const awsId = event.id
        const {productId, sagaId, market, domain, productType, timestamp} = event.detail
        const eventName = event["detail-type"]
        const source = event.source

        const uniqueIdFormat = `product_id=${productId}/market=${market}/domain=${domain}/event_name=${eventName}/timestamp=${timestamp}/saga=${sagaId}/bus_id=${awsId}`

        const uniqueEventId = uuid.generateUUID(uniqueIdFormat)

        const start = performance.now();
        const res = await dynamoClient.send(
            new PutItemCommand({
                TableName: Properties.productEventsTable,
                Item: {
                    unique_id: {S: uniqueEventId},
                    product_id: {S: productId},
                    market: {S: market},
                    aws_id: {S: awsId},
                    saga_id: {S: sagaId},
                    event_name: {S: eventName},
                    domain: {S: domain},
                    productType: {S: productType},
                    source: {S: source},
                    payload: {S: JSON.stringify(event.detail)},
                    timestamp: {N: timestamp.toString()}
                },
            })
        );

        if (res.$metadata.httpStatusCode === 200) {
            log.info(`Persist COMPLETE [duration=${Math.round(performance.now() - start)}ms]`);
        } else {
            log.error("Errors")
        }
    }
}
