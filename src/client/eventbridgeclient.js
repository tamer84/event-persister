const {EventBridgeClient, PutEventsCommand} = require('@aws-sdk/client-eventbridge'),
    log = require('../logger').logger(module.filename),
    {performance} = require('perf_hooks'),
    Properties = require("../util/properties");

const eventBridgeClient = new EventBridgeClient({region: Properties.region})

module.exports = {

    /**
     * Creates and Publishes Indexable / Validatable Events
     * @param sourceEvent the source event
     * @param type the type of event to emit
     */
    publishEvent(sourceEvent, type) {

        return publishEvent(createEvent(sourceEvent, type))

    }
}

/**
 * Generates the Indexable / Validatable Event payload
 * @param event the source event
 * @param type whether this is an IndexableEvent or a ValidatableEvent
 */
function createEvent(event, type) {

    log.info(`Follow up event created [productId=${event.detail.productId}, detailType=${type}]`);

    const {productId, sagaId, market, domain, productType, source} = event.detail;

    return [{
        DetailType: type,
        EventBusName: Properties.eventBus,
        Source: Properties.applicationName,
        Time: new Date(),
        Detail: JSON.stringify(
            {
                productId,
                sagaId,
                domain,
                productType,
                source,
                market,
                timestamp: +new Date()
            }
        )
    }]
}

/**
 * Publishes the event on the EventBridge
 * @param Entries Validatable or Indexable Event to publish
 */
async function publishEvent(Entries) {

    const start = performance.now();

    const res = await eventBridgeClient.send(new PutEventsCommand({Entries}))

    if (res.FailedEntryCount === 0) {
        log.info(`Publish COMPLETE [duration=${Math.round(performance.now() - start)}ms]`);
    } else {
        log.error("Publish has errors [failedEntries={}]", res.FailedEntryCount)
    }

}
