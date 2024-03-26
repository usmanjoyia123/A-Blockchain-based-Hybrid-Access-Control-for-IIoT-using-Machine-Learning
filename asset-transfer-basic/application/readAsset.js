/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";
const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const path = require("path");
const {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
} = require("../../test-application/javascript/CAUtil.js");
const {
  buildCCPOrg1,
  buildWallet,
} = require("../../test-application/javascript/AppUtil.js");
const fs = require("fs");

// Setup variables
const channelName = "mychannel";
const chaincodeName = "basic";
const mspOrg1 = "Org1MSP";
const walletPath = path.join(__dirname, "wallet");
const org1UserId = "user2";

async function main() {
  try {
    const ccp = buildCCPOrg1();
    const caClient = buildCAClient(
      FabricCAServices,
      ccp,
      "ca.org1.example.com"
    );
    const wallet = await buildWallet(Wallets, walletPath);
    await enrollAdmin(caClient, wallet, mspOrg1);
    await registerAndEnrollUser(
      caClient,
      wallet,
      mspOrg1,
      org1UserId,
      "org1.department1"
    );

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet,
      identity: org1UserId,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const promises = [];

    const startTime = process.hrtime();
    for (let i = 0; i < 50; i++) {
      const promise = contract
        .evaluateTransaction("ReadAsset", `asset${i + 65000}`)
        .then((results) => {
          const result = JSON.parse(results.toString());

          console.log(
            `Transaction ${i + 1} has been evaluated, result is: ${result}`
          );
        })
        .catch((error) => {
          console.error(`Error in transaction ${i + 1}: ${error}`);
        });

      promises.push(promise);
    }

    await Promise.all(promises);
    const endTime = process.hrtime(startTime);
    const timeTaken = endTime[0] * 1000 + endTime[1] / 1e6;

    console.log(`Time taken: ${timeTaken}ms`);
    const filePath = path.join(__dirname, "readAsset.txt");
    fs.appendFileSync(filePath, `50: ${timeTaken}\n`);

    gateway.disconnect();
  } catch (error) {
    console.error(`Failed to execute transactions: ${error}`);
    process.exit(1);
  }
}

main();
