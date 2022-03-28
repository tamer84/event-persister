const VALIDATABLE_EVENT = 'ValidatableEvent'
const INDEXABLE_EVENT = 'IndexableEvent'

module.exports = {

    /**
     * Determines what kind of follow up event is needed, if any.
     * ValidatedEvents are followed by an IndexableEvent
     * UpdatedEvents are followed ba a ValidatableEvent
     *
     * @param event
     * @returns {string}
     */
    followUpEvent(event) {

        if(isIndexable(event)) {
            return INDEXABLE_EVENT
        }
        else if(isValidatable(event)) {
            return VALIDATABLE_EVENT
        }

    }
}

const isIndexable = (eventName) => {
    return eventName.toLowerCase().includes('validated')
}
const isValidatable = (eventName) => {
    return eventName.toLowerCase().includes('updated') || eventName.endsWith('MediaItemsAddedEvent')
}