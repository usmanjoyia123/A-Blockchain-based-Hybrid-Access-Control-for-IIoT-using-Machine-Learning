const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const {
  buildCCPOrg1,
} = require("../../test-application/javascript/AppUtil.js");
const crypto = require("crypto");

function getPolicyID(userId, deviceId) {
  return crypto
    .createHash("sha256")
    .update(userId + deviceId)
    .digest("hex");
}

async function main() {
  try {
    const walletPath = path.join(__dirname, "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const gateway = new Gateway();
    const org1UserId = "user2";

    let ccp = buildCCPOrg1();

    await gateway.connect(ccp, {
      wallet,
      identity: org1UserId,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("basic");
    const startTime = process.hrtime();
    const promises = [];

    for (let i = 0; i < 1; i++) {
      const policyID1 = getPolicyID(`User${i + 20500 + 1}`, "Device1");
      const policyID2 = getPolicyID(`User${i + 20500}`, "Device1");
      const promise = contract
        .submitTransaction(
          "ManageConflicts",
          `Asset${i + 65000}`,
          policyID1,
          policyID2
        )
        .then((results) => {
          let result = results.toString();
          console.log(`Policy has been added ${i}, result is: ${result}`);
        })
        .catch((error) => console.error(`Error adding policy: ${error}`));

      promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = process.hrtime(startTime);
    const time = endTime[0] * 1000 + endTime[1] / 1e6;
    console.log(`All policies have been added in ${time} ms`);

    // Append to the file
    const filePath = path.join(__dirname, "manageConflict.txt");
    fs.appendFileSync(filePath, `50: ${time}\n`);

    gateway.disconnect();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
