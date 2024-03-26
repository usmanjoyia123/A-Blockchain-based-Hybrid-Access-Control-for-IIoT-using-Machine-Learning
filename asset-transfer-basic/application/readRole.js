/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";
const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const fs = require("fs");
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

    for (let i = 0; i < 1000; i++) {
      const promise = contract
        .evaluateTransaction(
          "getRole",
          "ffb9d97c7f5827b5a94031d36e8f01841da47005cda202de15441f08e8d84b0d"
        )
        .then((result) => {
          console.log(`Transaction has been evaluated, result is: ${result}`);
        })
        .catch((error) => {
          console.error(`Error in transaction ${i + 1}: ${error}`);
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = process.hrtime(startTime);
    const time = endTime[0] * 1000 + endTime[1] / 1e6;
    console.log(`All transactions have been evaluated in ${time}`);

    // Append to the file
    const filePath = path.join(__dirname, "readRolePolicy.txt");
    fs.appendFileSync(filePath, `1000: ${time}\n`);
    gateway.disconnect();
  } catch (error) {
    console.error(`Failed to execute transactions: ${error}`);
    process.exit(1);
  }
}

main();
