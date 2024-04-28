const AcademicCredentials = artifacts.require("AcademicCredentials");
const { it } = require("node:test");
const utils = require("./helpers/utils");
const credentialNames = ["Credential 1", "Credential 2", "Credential 3"];
const credentialTypes = [0, 1, 8];
const datesOfIssue = [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)];
const expirationDates = [Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60,
Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60];
const descriptions = ["Description 1", "Description 2", "Description 3"];
const credentialUrls = ["https://www.credential1.com", "https://www.credential2.com", "https://www.credential3.com"];

contract("AcademicCredentials", (accounts) => {
    let [alice, bob] = accounts;
    let contractInstance;
    beforeEach(async () => {
        contractInstance = await AcademicCredentials.new();
    });
    it("should be able to create a new credential", async () => {
        const result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
        assert.equal(result.receipt.status, true);
        assert.equal(result.logs[0].args.name, credentialNames[0]);
        assert.equal(result.logs[0].args.credentialType, credentialTypes[0]);
    });
    it("should be able to create a new credential with no expiration date", async () => {
        const result = await contractInstance.createCredential(credentialNames[1], credentialTypes[0], datesOfIssue[0], 0, descriptions[0], credentialUrls[0], { from: alice });
        assert.equal(result.receipt.status, true);
        assert.equal(result.logs[0].args.name, credentialNames[1]);
    });
    it("should not be able to create a credential with an expiration date in the past", async () => {
        await utils.shouldThrow(contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[2], descriptions[0], credentialUrls[0], { from: alice }));
    });
    it("should not be able to create a credential with a wrong credential type", async () => {
        await utils.shouldThrow(contractInstance.createCredential(credentialNames[0], "Wrong Credential Type", datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice }));
    });

})
