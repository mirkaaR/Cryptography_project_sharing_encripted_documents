const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureStorage", function () {
  let contract;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SecureStorage");
    contract = await Factory.deploy();
    // kod ethers v6 je dovoljno samo deploy, hardhat sačeka
  });

  it("should register document and assign owner access", async function () {
    const ipfsCid = "bafyTEST";
    const hash = "0x" + "11".repeat(32);

    await expect(contract.registerDocument(ipfsCid, hash, "0x"))
      .to.emit(contract, "DocumentAdded");

    const [ownerAddr, cid2, docHash, createdAt] = await contract.getMetadata(1);

    expect(ownerAddr).to.equal(owner.address);
    expect(cid2).to.equal(ipfsCid);
    expect(docHash.toLowerCase()).to.equal(hash.toLowerCase());
    // vlasnik mora da ima pristup
    expect(await contract.hasAccess(1, owner.address)).to.equal(true);
  });

  it("should allow owner to grant and revoke access", async function () {
    const hash = "0x" + "22".repeat(32);
    await contract.registerDocument("cid2", hash, "0x");

    // 🟢 event u tvom ugovoru ima 3 argumenta, zato ih i u testu stavljamo 3
    await expect(contract.grantAccess(1, alice.address, "0x1234"))
      .to.emit(contract, "AccessGranted")
      .withArgs(1, alice.address, "0x1234");

    expect(await contract.hasAccess(1, alice.address)).to.equal(true);

    const wrapped = await contract.getEncryptedKey(1, alice.address);
    expect(wrapped).to.equal("0x1234");

    await expect(contract.revokeAccess(1, alice.address))
      .to.emit(contract, "AccessRevoked")
      .withArgs(1, alice.address);

    expect(await contract.hasAccess(1, alice.address)).to.equal(false);
  });

  it("should prevent non-owner from granting access", async function () {
    const hash = "0x" + "33".repeat(32);
    await contract.registerDocument("cid3", hash, "0x");

    await expect(
      contract.connect(alice).grantAccess(1, bob.address, "0x9999")
    ).to.be.revertedWith("Samo vlasnik moze da upravlja pristupom.");
  });

  it("should verify document integrity correctly", async function () {
    const goodHash = "0x" + "44".repeat(32);
    await contract.registerDocument("cidZ", goodHash, "0x");

    // ⬇⬇⬇ OVO je ključno: ethers v6 → .staticCall
    const ok = await contract.verifyIntegrity.staticCall(1, goodHash);
    expect(ok).to.equal(true);

    const badHash = "0x" + "55".repeat(32);
    const notOk = await contract.verifyIntegrity.staticCall(1, badHash);
    expect(notOk).to.equal(false);
  });

  it("should correctly track multiple shared users", async function () {
    const hash = "0x" + "66".repeat(32);
    await contract.registerDocument("cidMulti", hash, "0x");

    await contract.grantAccess(1, alice.address, "0xaaaa");
    await contract.grantAccess(1, bob.address, "0xbbbb");

    const users = await contract.getSharedUsers(1);
    expect(users).to.include.members([alice.address, bob.address]);
  });
});
