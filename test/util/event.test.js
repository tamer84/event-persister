const eventUtil = require('../../src/util/event')

describe("followUpEvent", function() {

    it("isIndexable", async function() {

        const response = eventUtil.followUpEvent('drivingcyclecontainervalidatedevent')

        return expect(response).toBe('IndexableEvent');
    });

    it("isIndexable", async function() {

        const response = eventUtil.followUpEvent('vehiclestockiteminvalidated')

        return expect(response).toBe('IndexableEvent');
    });

    it("isValidatable", async function() {

        const response = eventUtil.followUpEvent('drivingcyclecontainerupdatedevent')

        return expect(response).toBe('ValidatableEvent');
    });

    it("noFollowUp", async function() {

        const response = eventUtil.followUpEvent('validatableevent')

        return expect(response).toBeUndefined();
    });


});


