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

  async function getAccounts(callback) {
    web3.eth.getAccounts((error, result) => {
      if (error) {
        console.log(error);
      } else {
        callback(result);
      }
    });
  }
  async function updateEmployeeDropdown(accounts, rankNames) {
    $("#employees").empty();
    const sortedAccounts = await getSortedAccounts(accounts);
    sortedAccounts.forEach(account => {
      let description = account.counts.map((count, index) => count > 0 ? `${count} ${rankNames[index]}` : '').filter(text => text).reverse().join(", ");
      $("#employees").append(`<option value="${account.account}">${account.account} ${description ? `(${description})` : ''}</option>`);
    });
  }

  async function displayCredentialsForUser(userType, accounts) {
    if (userType === "issuer") {
      getCredentialsByIssuer(userAccount).then(displayCredentials);
    } else {
      getCredentialsByOwner(accounts[0]).then(displayCredentials); // Assuming first account in list
    }
  }

  function handleAccountsChanged(accounts) {
    userAccount = accounts[0];
    ownersAccounts = accounts.slice(1);
    const rankNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

    if (userType === "issuer") {
      updateEmployeeDropdown(ownersAccounts, rankNames).then(() => displayCredentialsForUser(userType, ownersAccounts));
    } else if (userType === "employer") {
      updateEmployeeDropdown(ownersAccounts, rankNames).then(() => displayCredentialsForUser(userType, ownersAccounts));
    } else {
      getCredentialsByOwner(userAccount).then(displayCredentials);
    }
  }

  // Get accounts initially and setup listeners
  getAccounts(async function (result) {
    userAccount = result[0];
    ownersAccounts = result.slice(1);
    const rankNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

    if (["issuer", "employer"].includes(userType)) {
      updateEmployeeDropdown(ownersAccounts, rankNames).then(() => displayCredentialsForUser(userType, ownersAccounts));
    } else {
      getCredentialsByOwner(userAccount).then(displayCredentials);
    }
  });

  // Listen for account changes
  window.ethereum.on("accountsChanged", (accounts) => {
    handleAccountsChanged(accounts);
  });

  credentials.events
    .NewCredential({ filter: { issuer: userAccount } })
    .on("data", function () {
      if (userType == "issuer") {
        getCredentialsByIssuer(userAccount).then(displayCredentials);
      } else {
        getCredentialsByOwner(userAccount).then(displayCredentials);
      }
    })
    .on("error", console.error);

  credentials.events
    .Transfer({ filter: { _from: userAccount } })
    .on("data", function () {
      if (userType == "issuer") {
        getCredentialsByIssuer(userAccount).then(displayCredentials);
      } else {
        getCredentialsByOwner(userAccount).then(displayCredentials);
      }
    })
    .on("error", console.error);
}

async function updateUpgradeButton(credentialId) {
  const currentRank = await getCurrentRank(credentialId);
  const nextRankFee = await getNextRankFee(currentRank);

  const nextRankFeeInEther = nextRankFee / 10 ** 18;
  const button = document.getElementById("rank-upgrade-btn");
  button.innerHTML = `Upgrade Rank<br>(Fee: ${nextRankFeeInEther} ETH)`;
  button.onclick = () => handleUpgradeRank(credentialId, nextRankFee);
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

getSortedAccounts = async (accounts) => {
  let sortedAccounts = [];
  for (const account of accounts) {
    let counts = [];
    for (i = 0; i < 5; i++) {
      const numberOfCredentials = await getCredentialRankCount(account, i);
      counts.push(numberOfCredentials);
    }
    sortedAccounts.push({ account, counts });
  }
  // Sort the accounts based on ranks from most important (index 4) to least important (index 0)
  sortedAccounts.sort((a, b) => {
    for (let i = 4; i >= 0; i--) {  // start comparing from the most valuable rank
      if (a.counts[i] > b.counts[i]) {
        return -1;  // a should come before b
      } else if (a.counts[i] < b.counts[i]) {
        return 1;  // b should come before a
      }
    }
    return 0;  // if all ranks are the same, consider them equal in terms of sorting
  });

  return sortedAccounts;
}

function getCredentialRankCount(account, rank) {
  return credentials.methods.ownerCredentialRankCount(account, rank).call();
}

function displayCredentials(ids) {
  getSortedCredentials(ids).then(function (sortedCredentials) {
    $("#credentials").empty();
    $("#credentials-transfer").empty();
    console.log("Sorted credentials:", sortedCredentials);
    for (const credential of sortedCredentials) {
      $("#credentials").append(
        `<option id="${credential.id}" value="${credential.id
        }" class="credential cursor-pointer">${credential.details.name
        } - ${rankToString(credential.details.rank)} ${typeToString(credential.details.credentialType).toLowerCase()}</option>`
      );
      if (userType == "issuer") {
        credentials.methods
          .credentialToOwner(credential.id)
          .call()
          .then(function (owner) {
            if (owner == UNDEFINED_ADDRESS) {
              $("#credentials-transfer").append(
                `<option value="${credential.id}">${credential.details.name
                } ${intToDate(credential.details.dateIssued)}</option>`
              );
            }
          });
      }
    }
    if (userType == "employee") {
      updateUpgradeButton(sortedCredentials[0].id);
    }
    if (ids.length > 0) {
      handleViewCredential(sortedCredentials[0].id);
    } else {
      $("#credential-container").empty();
    }
  });
}

function handleViewCredential(id) {
  $("#credential-container").empty();
  getCredentialDetails(id).then(function (credential) {
    $("#credential-container").append(
      `<div class="diploma ${typeToString(credential.credentialType).toLowerCase()}">
        <div class="header">
          <h1>${credential.name}</h1>
          <br /><br />
          <div class="rank ${rankToString(credential.rank).toLowerCase()}">${rankToString(credential.rank)} Level</div>
        </div>
        <div class="info ${typeToString(
        credential.credentialType
      ).toLowerCase()}">
          <p>
              <span>${credential.description}</span>
          </p>
          <p>
              Credential URL:
              <a href="${credential.credentialUrl}" class="credential-url">${credential.credentialUrl}</a>
          </p>
          <div class="dates">
            <p>Issue: <span>${intToDate(credential.dateIssued)}</span></p>                                                          
            <p>Expiration: <span>${intToDate(credential.expirationDate)}</span></p>
          </div>
        </div>
          <div class="footer">
            <p class="type">Credential Type: <span>${typeToString(credential.credentialType)}</span>
            </p>
          </div>
        </div>
      </div>`
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
