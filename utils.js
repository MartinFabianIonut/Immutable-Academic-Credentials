var credentials;
var userAccount;
var userType;

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
      for (const account of ownersAccounts) {
        $("#employees").append(
          `<option value="${account}">${account}</option>`
        );
      }
      getCredentialsByIssuer(userAccount).then(displayCredentials);
    } else {
      getCredentialsByOwner(userAccount).then(displayCredentials);
    }
  });

  window.ethereum.on("accountsChanged", function (accounts) {
    userAccount = accounts[0];
    if (userType == "issuer") {
      getCredentialsByIssuer(userAccount).then(displayCredentials);
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

function displayCredentials(ids) {
  $("#credentials").empty();
  for (const id of ids) {
    getCredentialDetails(id).then(function (credential) {
      $("#credentials").append(
        `<div id="${id}" class="credential cursor-pointer" onClick="handleViewCredential(${id})">${
          credential.name
        } ${intToDate(credential.dateIssued)}</div>`
      );
      if (userType == "issuer") {
        $("#credentials-transfer").append(
          `<option value="${id}">${credential.name} ${intToDate(
            credential.dateIssued
          )}</option>`
        );
      }
    });
  }
}

function handleViewCredential(id) {
  document.querySelectorAll(".selected").forEach((element) => {
    element.classList.remove("selected");
  });
  document.getElementById(id).classList.add("selected");
  getCredentialDetails(id).then(function (credential) {
    $("#credential-details").empty();
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
