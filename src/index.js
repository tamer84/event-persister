const log = require('./logger').logger(module.filename),
    {performance} = require('perf_hooks'),
    dynamoClient = require('./client/dynamoclient'),
    eventbridgeClient = require('./client/eventbridgeclient'),
    eventUtil = require("./util/event");

exports.handler =  async (event, context) => {

    const {productId, sagaId, market, domain} = event.detail
    const eventDetail = event["detail-type"]

    const start = performance.now();

    try {
        await dynamoClient.save(event);

        const eventType = eventUtil.followUpEvent(eventDetail)

        if(eventType) {
            await eventbridgeClient.publishEvent(event, eventType)
        }
    }
    catch(err) {
        log.error({err});
        throw err
    }
    finally {
        log.info(`Event-Persister COMPLETE [duration=${Math.round(performance.now()-start)}ms]`);
    }

    return(`Event saved [productId=${productId}, sagaId=${sagaId}, market=${market}, domain=${domain}, detailType=${event["detail-type"]}]`);
}
