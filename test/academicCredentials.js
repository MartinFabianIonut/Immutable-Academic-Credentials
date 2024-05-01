const AcademicCredentials = artifacts.require("AcademicCredentials");
let contractInstance;
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
    context("who can change the rank of a credential", async () => {
        it("the issuer should not be able to change the rank of a credential", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await utils.shouldThrow(contractInstance.changeRank(credentialId, { from: alice }));
        });
        it("the owner should be able to change the rank of a credential to a higher one", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await contractInstance.transferFrom(alice, bob, credentialId, { from: alice });
            const newOwner = await contractInstance.ownerOf(credentialId);
            const { ethers } = require("ethers");
            let rankingFee = ethers.utils.parseEther("0.002");
            await contractInstance.changeRank(credentialId, { from: newOwner, value: rankingFee });
            rankingFee = ethers.utils.parseEther("0.0035");
            result = await contractInstance.changeRank(credentialId, { from: newOwner, value: rankingFee });
            assert.equal(result.logs[0].args.newRank, 2);
        });
    });
    context("with the single-step transfer scenario", async () => {
        it("should transfer a credential", async () => {
            const result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await contractInstance.transferFrom(alice, bob, credentialId, { from: alice });
            const newOwner = await contractInstance.ownerOf(credentialId);
            assert.equal(newOwner, bob);
        });
        it("should not be able to transfer a credential if not the issuer or approved", async () => {
            const result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await utils.shouldThrow(contractInstance.transferFrom(alice, bob, credentialId, { from: bob }));
        });
    });
    context("with the two-step transfer scenario", async () => {
        it("should approve and then transfer a credential when the approved address calls transferFrom", async () => {
            const result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await contractInstance.approve(bob, credentialId, { from: alice });
            await contractInstance.transferFrom(alice, bob, credentialId, { from: bob });
            const newOwner = await contractInstance.ownerOf(credentialId);
            assert.equal(newOwner, bob);
        })
        it("should approve and then transfer a credential when the owner calls transferFrom", async () => {
            const result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await contractInstance.approve(bob, credentialId, { from: alice });
            await contractInstance.transferFrom(alice, bob, credentialId, { from: alice });
            const newOwner = await contractInstance.ownerOf(credentialId);
            assert.equal(newOwner, bob);
        })
    });
    context("change the name of a credential", async () => {
        it("the issuer should be able to change the name of a credential", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credential = await contractInstance.credentials(result.logs[0].args.credentialId);
            const credentialType = credential["credentialType"];
            const dateOfIssue = credential["dateIssued"];
            const expirationDate = credential["expirationDate"];
            const description = credential["description"];
            const url = credential["credentialUrl"];

            const credentialId = result.logs[0].args.credentialId.toNumber();

            result = await contractInstance.changeCredential(credentialId, "New Name", credentialType, dateOfIssue, expirationDate, description, url, { from: alice });
            assert.equal(result.logs[0].args.name, "New Name");
        });
        it("the issuer should not be able to change the name of a credential with not enough parameters", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await utils.shouldThrow(contractInstance.changeCredential(credentialId, "New Name", { from: alice }));
        });
        if ("someone else should not be able to change the name of a credential", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credential = await contractInstance.credentials(result.logs[0].args.credentialId);
            const credentialType = credential["credentialType"];
            const dateOfIssue = credential["dateIssued"];
            const expirationDate = credential["expirationDate"];
            const description = credential["description"];
            const url = credential["credentialUrl"];
            const credentialId = result.logs[0].args.credentialId.toNumber();
            await utils.shouldThrow(contractInstance.changeCredential(credentialId, "New Name", credentialType, dateOfIssue, expirationDate, description, url, { from: bob }));
        });
    });
    context("change the description of a credential", async () => {
        it("the issuer should be able to change the description of a credential", async () => {
            let result = await contractInstance.createCredential(credentialNames[0], credentialTypes[0], datesOfIssue[0], expirationDates[0], descriptions[0], credentialUrls[0], { from: alice });
            const credential = await contractInstance.credentials(result.logs[0].args.credentialId);
            const name = credential["name"];
            const credentialType = credential["credentialType"];
            const dateOfIssue = credential["dateIssued"];
            const expirationDate = credential["expirationDate"];
            const url = credential["credentialUrl"];
            const credentialId = result.logs[0].args.credentialId.toNumber();
            result = await contractInstance.changeCredential(credentialId, name, credentialType, dateOfIssue, expirationDate, "New Description", url, { from: alice });
            assert.equal(result.logs[0].args.description, "New Description");
        });
    });
})
