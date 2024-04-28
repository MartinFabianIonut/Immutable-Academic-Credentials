var AcademicCredentials = artifacts.require("./AcademicCredentials.sol");
module.exports = function (deployer) {
  deployer.deploy(AcademicCredentials);
};