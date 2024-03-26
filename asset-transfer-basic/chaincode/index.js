/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const ConflictResolutionContract = require("./lib/sensorChaincode");

module.exports.ConflictResolutionContract = ConflictResolutionContract;
module.exports.contracts = [ConflictResolutionContract];
