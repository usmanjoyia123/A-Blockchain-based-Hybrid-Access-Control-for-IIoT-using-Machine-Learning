const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const {
  buildCCPOrg1,
} = require("../../test-application/javascript/AppUtil.js");

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
    const times = [];

    const startTime = process.hrtime();
    for (let i = 0; i < 1000; i++) {
      promises.push(
        contract
          .submitTransaction(
            "ChangeDeviceStateByClient",
            `asset${i + 65000}`,
          )
          .then((results) => {
            let result = JSON.parse(results.toString());

            console.log(
              `Transaction ${i + 1} has been evaluated, result is: ${result}`
            );
          })
          .catch((error) =>
            console.error(`Error in transaction ${i}: ${error}`)
          )
      );
    }
    await Promise.all(promises);
    const endTime = process.hrtime(startTime);

    const timeTaken = endTime[0] * 1000 + endTime[1] / 1e6;
    // Append to the file
    const filePath = path.join(__dirname, "changeDevice.txt");
    fs.appendFileSync(filePath, `1000: ${timeTaken}\n`);

    console.log("All transactions processed. Time taken: " + timeTaken + "ms");

    gateway.disconnect();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
