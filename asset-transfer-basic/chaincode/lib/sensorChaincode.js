/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

// Deterministic JSON.stringify()
const stringify = require("json-stringify-deterministic");
const sortKeysRecursive = require("sort-keys-recursive");
const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");

class SR {
  constructor(UserId, Role, Group) {
    this.UserId = UserId;
    this.Role = Role;
    this.Group = Group;
  }
}

class AO {
  constructor(DeviceId, MAC) {
    this.DeviceId = DeviceId;
    this.MAC = MAC;
  }
}

class SP {
  constructor(Read, Write, Execute) {
    this.Read = Read;
    this.Write = Write;
    this.Execute = Execute;
  }
}

class AE {
  constructor(CreatedTime, EndTime, AllowedIP) {
    this.CreatedTime = CreatedTime;
    this.EndTime = EndTime;
    this.AllowedIP = AllowedIP;
  }
}

class Policy {
  constructor(
    userId,
    role,
    group,
    deviceId,
    mac,
    read,
    write,
    execute,
    createdTime,
    endTime,
    allowedIP
  ) {
    this.SR = new SR(userId, role, group);
    this.AO = new AO(deviceId, mac);
    this.SP = new SP(read, write, execute);
    this.AE = new AE(createdTime, endTime, allowedIP);
  }

  getID() {
    const hash = crypto.createHash("sha256");
    hash.update(`${this.SR.UserId}${this.AO.DeviceId}`);
    return hash.digest("hex");
  }

  toJSON() {
    return {
      SR: this.SR,
      AO: this.AO,
      SP: this.SP,
      AE: this.AE,
    };
  }

  static fromJSON(json) {
    const policy = new Policy();
    policy.SR = json.SR;
    policy.AO = json.AO;
    policy.SP = json.SP;
    policy.AE = json.AE;
    return policy;
  }
}

class Asset {
  constructor(asset) {
    this.ID = asset.ID;
    this.Balance = asset.Balance;
    this.Owner = asset.Owner;
    this.actuator = asset.actuator;
    this.AppraisedValue = asset.AppraisedValue;
  }
}

class ConflictResolutionContract extends Contract {
  async InitLedger(ctx) {
    console.info("============= Initialize Ledger ===========");
  }

  async CreatePolicy(
    ctx,
    userId,
    role,
    group,
    deviceId,
    mac,
    read,
    write,
    execute,
    createdTime,
    endTime,
    allowedIP
  ) {
    console.info("============= START : Create Policy ===========");
    const policy = new Policy(
      userId,
      role,
      group,
      deviceId,
      mac,
      read,
      write,
      execute,
      createdTime,
      endTime,
      allowedIP
    );

    // check if the policy already exists
    const policyString = await ctx.stub.getState(policy.getID());
    if (policyString && policyString.length > 0) {
      throw new Error(`The policy ${policy.getID()} already exists`);
    }
    console.log("policy", policy);
    const serializedPolicy = JSON.stringify(policy.toJSON());
    await ctx.stub.putState(policy.getID(), Buffer.from(serializedPolicy));
    console.info("============= END : Create Policy ===========");

    return policy.getID();
  }

  async ReadPolicy(ctx, policyID) {
    const policyString = await ctx.stub.getState(policyID);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    return policyString.toString();
  }

  async UpdatePolicy(
    ctx,
    userId,
    role,
    group,
    deviceId,
    mac,
    read,
    write,
    execute,
    createdTime,
    endTime,
    allowedIP
  ) {
    console.info("============= START : Update Policy ===========");
    const policy = new Policy(
      userId,
      role,
      group,
      deviceId,
      mac,
      read,
      write,
      execute,
      createdTime,
      endTime,
      allowedIP
    );

    // check if the policy already exists
    const policyString = await ctx.stub.getState(policy.getID());
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policy.getID()} does not exist`);
    }

    const serializedPolicy = JSON.stringify(policy.toJSON());
    await ctx.stub.putState(policy.getID(), Buffer.from(serializedPolicy));

    console.info("============= END : Update Policy ===========");
  }

  async DeletePolicy(ctx, policyID) {
    console.info("============= START : Delete Policy ===========");
    // check if the policy already exists
    const policyString = await ctx.stub.getState(policyID);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }
    await ctx.stub.deleteState(policyID);
    console.info("============= END : Delete Policy ===========");
  }

  async delegateAccess(ctx, policyID, newPolicyId) {
    console.info("============= START : Delegate Access ===========");
    // check if the policy already exists
    const policyString = await ctx.stub.getState(newPolicyId);
    if (!policyString && !policyString.length > 0) {
      throw new Error(`The policy ${newPolicyId} does not exists`);
    }

    console.log("Policy String");

    const deserializedPolicy = Policy.fromJSON(
      JSON.parse(policyString.toString())
    );
    console.log("Deserialized Policy");

    // check if the oldPolicy exists
    const oldPolicyString = await ctx.stub.getState(policyID);
    if (!oldPolicyString || oldPolicyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    console.log("Old Policy String");

    const oldPolicy = Policy.fromJSON(JSON.parse(oldPolicyString.toString()));

    console.log("Hello");
    // copy the old policy role and permission to the new policy
    deserializedPolicy.SR.Role = oldPolicy.SR.Role;
    deserializedPolicy.SP = oldPolicy.SP;

    const serializedPolicy = JSON.stringify(deserializedPolicy.toJSON());

    await ctx.stub.putState(newPolicyId, Buffer.from(serializedPolicy));

    console.info("============= END : Delegate Access ===========");
  }

  // update permission of a policy
  async updatePermission(ctx, policyID, newPermission) {
    console.info("============= START : Update Permission ===========");
    // check if the policy already exists
    const policyString = await ctx.stub.getState(policyID);
    const policy = new Policy(policyString);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    policy.SP = newPermission;
    await ctx.stub.putState(
      policyID,
      Buffer.from(stringify(sortKeysRecursive(policy)))
    );

    console.info("============= END : Update Permission ===========");
  }

  // update role of a policy
  async updateRole(ctx, policyID, newRole) {
    console.info("============= START : Update Role ===========");
    // check if the policy already exists
    const policyString = await ctx.stub.getState(policyID);
    const policy = new Policy(policyString);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    policy.SR.Role = newRole;
    await ctx.stub.putState(
      policyID,
      Buffer.from(stringify(sortKeysRecursive(policy)))
    );

    console.info("============= END : Update Role ===========");
  }

  // get role of a policy
  async getRole(ctx, policyID) {
    const policyString = await ctx.stub.getState(policyID);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    const policy = Policy.fromJSON(JSON.parse(policyString.toString()));

    return policy.SR.Role;
  }

  // get permission of a policy
  async getPermission(ctx, policyID) {
    const policyString = await ctx.stub.getState(policyID);
    const policy = new Policy(policyString);
    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    return policy.SP;
  }

  // match role of a policy
  async checkAssess(ctx, policyID, role) {
    const policyString = await ctx.stub.getState(policyID);

    if (!policyString || policyString.length === 0) {
      throw new Error(`The policy ${policyID} does not exist`);
    }

    const deserializedPolicy = Policy.fromJSON(
      JSON.parse(policyString.toString())
    );

    return deserializedPolicy.SR.Role === role;
  }

  // check overlapping permissions of two policies
  async checkPermissionOverlap(ctx, policyID1, policyID2) {
    const policyString1 = await ctx.stub.getState(policyID1);

    const policy1 = Policy.fromJSON(JSON.parse(policyString1.toString()));
    if (!policyString1 || policyString1.length === 0) {
      throw new Error(`The policy ${policyID1} does not exist`);
    }

    const policyString2 = await ctx.stub.getState(policyID2);
    const policy2 = Policy.fromJSON(JSON.parse(policyString2.toString()));

    if (!policyString2 || policyString2.length === 0) {
      throw new Error(`The policy ${policyID2} does not exist`);
    }

    return (
      (policy1.SP.Write === policy2.SP.Write) === 1 ||
      (policy1.SP.Execute === policy2.SP.Execute) === 1
    );
  }

  // create Asset with
  async CreateAsset(
    ctx,
    id,
    balance,
    owner,
    actuator,
    appraisedValue,
    policyId
  ) {
    console.info("============= START : Create Asset ===========");
    // check for role in the policy, it should be sensor
    // const policyString = await ctx.stub.getState(policyId);
    // const policy = new Policy(policyString);
    // if (!policyString || policyString.length === 0) {
    //   throw new Error(`The policy ${policyId} does not exist`);
    // }

    // if (policy.SR.Role !== "sensor") {
    //   throw new Error(`The role of the policy ${policyId} is not sensor`);
    // }

    const checkAsset = await ctx.stub.getState(id);
    if (checkAsset && checkAsset.length > 0) {
      throw new Error(`The asset ${id} already exists`);
    }

    const asset = {
      ID: id,
      Balance: balance,
      Owner: owner,
      actuator: actuator,
      AppraisedValue: appraisedValue,
    };

    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );

    if (balance > 1000) {
      this.ChangeDeviceStateByController(ctx, id);
    }

    if (balance < 600 && appraisedValue < 800) {
      this.ManageConflicts(ctx, id);
    }

    console.info("============= END : Create Asset ===========");
    return JSON.stringify(asset);
  }

  // read asset
  async ReadAsset(ctx, id) {
    console.info("============= START : Read Asset ===========");
    const assetString = await ctx.stub.getState(id);
    if (!assetString || assetString.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }

    return assetString.toString();
  }

  // get all assets
  async GetAllAssets(ctx) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push({ Key: result.value.key, Record: record });
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  // change actuator state by controller
  async ChangeDeviceStateByClient(ctx, assetId) {
    console.info(
      "============= START : Create Change Device State By Service ==========="
    );
    const assetString = await ctx.stub.getState(assetId);
    const asset = new Asset(assetString);

    if (asset.actuator) {
      asset.actuator = false;
    } else {
      asset.actuator = true;
    }

    await ctx.stub.putState(
      assetId,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );
    console.info(
      "============= END : Change Device State By Service ==========="
    );
  }

  async ManageConflicts(ctx, assetId, policyID1, policyID2) {
    console.info("============= START : Manage Conflict Trigger ===========");
    console.info("============= START : Revoke Permission Overlap ===========");

    const policyString1 = await ctx.stub.getState(policyID1);
    const policy1 = Policy.fromJSON(JSON.parse(policyString1.toString()));
    console.log("Policy 1");
    if (!policyString1 || !policyString1) {
      throw new Error(`One or both policies do not exist`);
    }
    console.log("Policy 2:", policyID2);
    const policyString2 = await ctx.stub.getState(policyID2);
    const policy2 = Policy.fromJSON(JSON.parse(policyString2.toString()));
    console.log("Policy 2");

    if (!policyString2 || !policyString2) {
      throw new Error(`One or both policies do not exist`);
    }
    console.log("HEEELLLLLOOOOOOOOOOO");

    if (
      (policy1.SP.Write === policy2.SP.Write) === 1 ||
      (policy1.SP.Execute === policy2.SP.Execute) === 1
    ) {
      if (policy1.SP.Write === 1) policy2.SP.Write = 0;
      if (policy1.SP.Execute === 1) policy2.SP.Execute = 0;
    }
    const serializedPolicy2 = JSON.stringify(policy2.toJSON());

    console.log("HEEELLLLLOOOOOOOOOOO22222222222222");

    await ctx.stub.putState(
      policyID2,
      Buffer.from(serializedPolicy2)
    );

    console.info("============= END : Revoke Permission Overlap ===========");

    const asset = await ctx.stub.getState(assetId);

    if (asset.actuator) {
      asset.actuator = false;
    } else {
      asset.actuator = true;
    }

    await ctx.stub.putState(
      assetId,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );
    console.info("============= END : Manage Conflict Trigger ===========");
  }
}

module.exports = ConflictResolutionContract;
