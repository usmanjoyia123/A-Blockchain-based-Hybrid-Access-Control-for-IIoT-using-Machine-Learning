const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const {
  buildCCPOrg1,
} = require("../../test-application/javascript/AppUtil.js");
const crypto = require("crypto");

function getID(userId, DeviceId) {
  const hash = crypto.createHash("sha256");
  hash.update(`${userId}${DeviceId}`);
  return hash.digest("hex");
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

    const promises = [];
    const startTime = process.hrtime();

    for (let i = 0; i < 50; i++) {
      const policyId = getID(`User${i + 9000}`, "Device1");
      const promise = contract
        .submitTransaction("DeletePolicy", policyId)
        .then((results) => {
          let result = results.toString();
          console.log(`Policy has been added, result is: ${result}`);
        })
        .catch((error) => console.error(`Error adding policy: ${error}`));

      promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = process.hrtime(startTime);
    const time = endTime[0] * 1000 + endTime[1] / 1e6;
    console.log(`All policies have been added in ${time} ms`);
    // Append to the file
    const filePath = path.join(__dirname, "delPolicy.txt");
    fs.appendFileSync(filePath, `50: ${time}\n`);

    gateway.disconnect();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
