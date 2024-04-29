var credentials;
var userAccount;

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
    console.log("hello");
    getCredentialsByOwner(userAccount).then(displayCredentials);
  });

  window.ethereum.on("accountsChanged", function (accounts) {
    userAccount = accounts[0];
    console.log("User Account changed:", userAccount);
    getCredentialsByOwner(userAccount).then(displayCredentials);
  });

  credentials.events
    .NewCredential({ filter: { issuer: userAccount } })
    .on("data", function (event) {
      let data = event.returnValues;
      getCredentialsByOwner(userAccount).then(displayCredentials);
    })
    .on("error", console.error);

  credentials.events
    .Transfer({ filter: { _from: userAccount } })
    .on("data", function (event) {
      let data = event.returnValues;
      getCredentialsByOwner(userAccount).then(displayCredentials);
    })
    .on("error", console.error);
}

function displayCredentials(ids) {
  console.log(ids);
  $("#credentials").empty();
  for (const id of ids) {
    getCredentialDetails(id).then(function (credential) {
      $("#credentials").append(`<div class="credential">
							<ul>
								<li>Name: ${credential.name}</li>
								<li>Date of Issue: ${intToDate(credential.dateIssued)}</li>
								<li>Expiration Date: ${intToDate(credential.expirationDate)}</li>
								<li>Description: ${credential.description}</li>
								<li>Credential URL: <a href="${
                  credential.credentialUrl
                }">${credential.credentialUrl}</a></li>
								<li>Credential Type: ${typeToString(credential.credentialType)}</li>
							</ul>
							</div>`);
    });
  }
}

function getCredentialDetails(id) {
  return credentials.methods.credentials(id).call();
}

function getCredentialsByOwner(owner) {
  return credentials.methods.getCredentialsByOwner(owner).call();
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

function loadApp() {
  window.addEventListener("load", function () {
    if (typeof web3 !== "undefined") {
      web3js = new Web3(web3.currentProvider);
    } else {
      // Handle the case where the user doesn't have Metamask installed
      // Probably show them a message prompting them to install Metamask
      console.log("No web3? You should consider trying MetaMask!");
    }

    startApp();
  });
}
