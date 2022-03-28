const crypto = require('crypto');

module.exports = {
    /**
     * This function generates a UUID using the same logic as the Java method UUID.nameUUIDFromBytes()
     * which was used in the previous version of the event-persister.
     *
     * @param input the uuid generation data
     * @returns {string} the generated uuid
     */

    generateUUID(input) {
        let md5Bytes = crypto.createHash('md5').update(input).digest();
        md5Bytes[6] &= 0x0f;  /* clear version        */
        md5Bytes[6] |= 0x30;  /* set to version 3     */
        md5Bytes[8] &= 0x3f;  /* clear variant        */
        md5Bytes[8] |= 0x80;  /* set to IETF variant  */
        const hex = md5Bytes.toString('hex')
        const uuid = hex.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, "$1-$2-$3-$4-$5");
        return uuid;
    }
};