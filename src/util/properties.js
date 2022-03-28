module.exports = {
    ...(process.env.APPLICATION_NAME
        ? { applicationName: process.env.APPLICATION_NAME }
        : { applicationName: "event-persister-dev" }),
    ...(process.env.REGION
        ? { region: process.env.REGION }
        : { region: "eu-central-1" }),
    ...(process.env.PRODUCT_EVENTS_TABLE
        ? { productEventsTable: process.env.PRODUCT_EVENTS_TABLE }
        : { productEventsTable: "product-events-dev" }),
    ...(process.env.EVENT_BUS
        ? { eventBus: process.env.EVENT_BUS }
        : { eventBus: "events-dev" })
};
