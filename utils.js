var credentials;
var userAccount;
var userType;
var ownersAccounts;
const UNDEFINED_ADDRESS = "0x0000000000000000000000000000000000000000";

async function startApp() {
  var credentialAddress = CREDENTIAL_ADDRESS;
  credentials = new web3js.eth.Contract(
    AcademicCredentialABI,
    credentialAddress
  );

  if (window.ethereum) {
    await ethereum.enable();
  }

  function getAccounts(callback) {
    web3.eth.getAccounts((error, result) => {
      if (error) {
        console.log(error);
      } else {
        callback(result);
      }
    });
  }

  getAccounts(function (result) {
    userAccount = result[0];
    if (userType == "issuer") {
      ownersAccounts = result.slice(1);
      $("#employees").empty();
      for (const account of ownersAccounts) {
        $("#employees").append(
          `<option value="${account}">${account}</option>`
        );
      }
      getCredentialsByIssuer(userAccount).then(displayCredentials);
    } else if (userType == "employer") {
      ownersAccounts = result.slice(1);
      $("#employees").empty();
      // TODO: SORT BY RANK
      for (const account of ownersAccounts) {
        $("#employees").append(
          `<option value="${account}">${account}</option>`
        );
      }
      getCredentialsByOwner(ownersAccounts[0]).then(displayCredentials);
    } else {
      getCredentialsByOwner(userAccount).then(displayCredentials);
    }
  });

  window.ethereum.on("accountsChanged", function (accounts) {
    userAccount = accounts[0];
    if (userType == "issuer") {
      ownersAccounts = accounts.slice(1);
      $("#employees").empty();
      for (const account of ownersAccounts) {
        $("#employees").append(
          `<option value="${account}">${account}</option>`
        );
      }
      getCredentialsByIssuer(userAccount).then(displayCredentials);
    } else if (userType == "employer") {
      ownersAccounts = accounts.slice(1);
      $("#employees").empty();
      // TODO: SORT BY RANK
      for (const account of ownersAccounts) {
        $("#employees").append(
          `<option value="${account}">${account}</option>`
        );
      }
      getCredentialsByOwner(ownersAccounts[0]).then(displayCredentials);
    } else {
      getCredentialsByOwner(userAccount).then(displayCredentials);
    }
  });

  credentials.events
    .NewCredential({ filter: { issuer: userAccount } })
    .on("data", function (event) {
      let data = event.returnValues;
      if (userType == "issuer") {
        getCredentialsByIssuer(userAccount).then(displayCredentials);
      } else {
        getCredentialsByOwner(userAccount).then(displayCredentials);
      }
    })
    .on("error", console.error);

  credentials.events
    .Transfer({ filter: { _from: userAccount } })
    .on("data", function (event) {
      let data = event.returnValues;
      if (userType == "issuer") {
        getCredentialsByIssuer(userAccount).then(displayCredentials);
      } else {
        getCredentialsByOwner(userAccount).then(displayCredentials);
      }
    })
    .on("error", console.error);
}

async function getSortedCredentials(ids) {
  var sortedCredentials = [];
  for (const id of ids) {
    await getCredentialDetails(id).then(function (credential) {
      sortedCredentials.push({ details: credential, id: id });
    });
  }
  return sortedCredentials.sort((a, b) => b.details.rank - a.details.rank);
}

function displayCredentials(ids) {
  $("#credentials").empty();
  $("#credentials-transfer").empty();
  getSortedCredentials(ids).then(function (sortedCredentials) {
    console.log(sortedCredentials);
    for (const credential of sortedCredentials) {
      $("#credentials").append(
        `<option id="${credential.id}" value="${
          credential.id
        }" class="credential cursor-pointer">${
          credential.details.name
        } ${intToDate(credential.details.dateIssued)}</option>`
      );
      if (userType == "issuer") {
        credentials.methods
          .credentialToOwner(credential.id)
          .call()
          .then(function (owner) {
            if (owner == UNDEFINED_ADDRESS) {
              $("#credentials-transfer").append(
                `<option value="${credential.id}">${
                  credential.details.name
                } ${intToDate(credential.details.dateIssued)}</option>`
              );
            }
          });
      }
    }
  });

  if (ids.length > 0) {
    handleViewCredential(ids[0]);
  } else {
    $("#credential-details").empty();
  }
}

function handleViewCredential(id) {
  $("#credential-details").empty();
  getCredentialDetails(id).then(function (credential) {
    $("#credential-details").append(
      `<div>Name: ${credential.name}</div>
                    <div>Date of Issue: ${intToDate(
                      credential.dateIssued
                    )}</div>
                    <div>Expiration Date: ${intToDate(
                      credential.expirationDate
                    )}</div>
                    <div>Description: ${credential.description}</div>
                    <div>Credential URL: <a style="color:white; text-decoration: underline" href="${
                      credential.credentialUrl
                    }">${credential.credentialUrl}</a></div>
                    <div>Credential Type: ${typeToString(
                      credential.credentialType
                    )}</div>
                    <div>Credential Rank: ${rankToString(credential.rank)}</div>
                `
    );
  });
}

function getCredentialDetails(id) {
  return credentials.methods.credentials(id).call();
}

function intToDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().split("T")[0];
}

function typeToString(type) {
  switch (type) {
    case "0":
      return "Certificate";
    case "1":
      return "Degree";
    case "2":
      return "Achievement";
    default:
      return "Unknown";
  }
}

function rankToString(rank) {
  switch (rank) {
    case "0":
      return "Bronze";
    case "1":
      return "Silver";
    case "2":
      return "Gold";
    case "3":
      return "Platinum";
    case "4":
      return "Diamond";
    default:
      return "None";
  }
}

async function loadApp() {
  window.addEventListener("load", function () {
    if (typeof web3 !== "undefined") {
      web3js = new Web3(web3.currentProvider);
    } else {
      console.log("No web3? You should consider trying MetaMask!");
    }

    startApp();
  });
}
