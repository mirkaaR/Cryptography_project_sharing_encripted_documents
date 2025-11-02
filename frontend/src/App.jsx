import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "./web3/contract";
import {
  sha256Hex, genAesKey, genIv, aesEncrypt, aesDecrypt,
  genRsaKeypair, exportPublicKeyPEM, exportPrivateKeyPKCS8,
  importPublicKeyPEM, importPrivateKeyPKCS8,
  wrapAesKeyFor, unwrapAesKey, bufToHex, hexToBuf
} from "./crypto/crypto";
import { uploadBytes, downloadToArrayBuffer } from "./ipfs/pinata";
import "./index.css";

export default function App() {
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("");
  const [docId, setDocId] = useState(null);
  const [myPubPEM, setMyPubPEM] = useState("");
  const [recipientAddr, setRecipientAddr] = useState("");
  const [recipientPubPEM, setRecipientPubPEM] = useState("");

  const keyNames = (addr) => ({
    pub: `rsaPubPEM:${addr?.toLowerCase()}`,
    priv: `rsaPrivPEM:${addr?.toLowerCase()}`,
  });

  useEffect(() => {
    if (!window.ethereum) return;
  }, []);

  async function connect() {
    if (!window.ethereum) return alert("Install MetaMask");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
  }

  async function ensureMyKeys() {
    if (!account) throw new Error("Connect MetaMask first");
    const names = keyNames(account);
    const spub = localStorage.getItem(names.pub);
    const spriv = localStorage.getItem(names.priv);
    if (spub && spriv) {
      setMyPubPEM(spub);
      return {
        pub: await importPublicKeyPEM(spub),
        priv: await importPrivateKeyPKCS8(spriv),
        pubPEM: spub,
      };
    }
    const { publicKey, privateKey } = await genRsaKeypair();
    const pubPEM = await exportPublicKeyPEM(publicKey);
    const privPEM = await exportPrivateKeyPKCS8(privateKey);
    localStorage.setItem(names.pub, pubPEM);
    localStorage.setItem(names.priv, privPEM);
    setMyPubPEM(pubPEM);
    return { pub: publicKey, priv: privateKey, pubPEM };
  }

  async function handleUploadRegister(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!account) await connect();
      setStatus("Encrypting & uploading...");

      const { pub } = await ensureMyKeys();
      const plain = await file.arrayBuffer();
      const aesKey = await genAesKey();
      const iv = genIv();
      const cipher = await aesEncrypt(aesKey, plain, iv);

      const packed = new Uint8Array(iv.length + cipher.byteLength);
      packed.set(iv, 0);
      packed.set(new Uint8Array(cipher), iv.length);

      const cid = await uploadBytes(packed, file.name + ".enc");
      const hashHex = await sha256Hex(packed.buffer);
      const wrapped = await wrapAesKeyFor(pub, aesKey);
      const wrappedHex = bufToHex(wrapped);

      const contract = await getContract();
      const tx = await contract.registerDocument(cid, hashHex, wrappedHex);
      await tx.wait();

      const id = Number(await contract.nextId());
      setDocId(id);
      localStorage.setItem(`origName:${id}`, file.name);
      setStatus(`✅ File registered (docId=${id})`);
    } catch (err) {
      setStatus("❌ " + (err.message || err));
    }
  }

  async function downloadAndDecrypt() {
    try {
      if (!account) await connect();
      if (!docId) return alert("Register document first");
      const contract = await getContract();
      const [owner, cid, docHash] = await contract.getMetadata(docId);
      const { priv } = await ensureMyKeys();
      const wrappedHex = await contract.getEncryptedKey(docId, account);
      if (!wrappedHex || wrappedHex === "0x") return alert("No key found");

      const aesKey = await unwrapAesKey(priv, hexToBuf(wrappedHex));
      const packed = await downloadToArrayBuffer(cid);
      const calc = await sha256Hex(packed);
      if (calc.toLowerCase() !== docHash.toLowerCase())
        return alert("File corrupted");

      const bytes = new Uint8Array(packed);
      const iv = bytes.slice(0, 12);
      const cipher = bytes.slice(12).buffer;
      const plain = await aesDecrypt(aesKey, cipher, iv);

      const blob = new Blob([plain]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const origName = localStorage.getItem(`origName:${docId}`) || "file.bin";
      a.href = url;
      a.download = origName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("✅ File downloaded and decrypted");
    } catch (err) {
      setStatus("❌ " + (err.message || err));
    }
  }

  async function showMyPublicKey() {
    try {
      const { pubPEM } = await ensureMyKeys();
      setMyPubPEM(pubPEM);
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function grantAccess() {
    try {
      if (!account) await connect();
      if (!docId) return alert("Missing document");
      const contract = await getContract();
      const { priv } = await ensureMyKeys();
      const myWrappedHex = await contract.getEncryptedKey(docId, account);
      const aesKey = await unwrapAesKey(priv, hexToBuf(myWrappedHex));
      const recipPub = await importPublicKeyPEM(recipientPubPEM);
      const recipWrapped = await wrapAesKeyFor(recipPub, aesKey);
      const recipWrappedHex = bufToHex(recipWrapped);
      const tx = await contract.grantAccess(docId, recipientAddr, recipWrappedHex);
      await tx.wait();
      setStatus("✅ Access granted");
    } catch (err) {
      setStatus("❌ " + (err.message || err));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-gray-200">
      {/* Navbar */}
      <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-lg">
              <span className="text-white font-bold text-lg">🔐</span>
            </div>
            <h1 className="text-xl font-bold text-white">SecureStorage DApp</h1>
          </div>
          <button
            onClick={connect}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium"
          >
            {account
              ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-10 text-white">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Upload */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 hover:border-indigo-500 transition">
            <h3 className="text-lg font-semibold text-indigo-400 mb-4">
              Upload & Register
            </h3>
            <input
              type="file"
              onChange={handleUploadRegister}
              className="block w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-sm"
            />
            <p className="mt-3 text-sm text-gray-400">
              Registered docId: <span className="text-indigo-400">{docId ?? "-"}</span>
            </p>
          </div>

          {/* Download */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 hover:border-indigo-500 transition">
            <h3 className="text-lg font-semibold text-indigo-400 mb-4">
              Download & Decrypt
            </h3>
            <button
              onClick={downloadAndDecrypt}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium"
            >
              Download
            </button>
          </div>

          {/* RSA Key */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 hover:border-indigo-500 transition">
            <h3 className="text-lg font-semibold text-indigo-400 mb-4">
              My RSA Public Key
            </h3>
            <button
              onClick={showMyPublicKey}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium mb-3"
            >
              Show Key
            </button>
            <textarea
              readOnly
              value={myPubPEM}
              placeholder="Your public key will appear here..."
              className="w-full p-3 h-28 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-xs font-mono"
            />
          </div>

          {/* Grant Access */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 hover:border-indigo-500 transition md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold text-indigo-400 mb-4">
              Grant Access
            </h3>
            <input
              placeholder="Recipient Ethereum address (0x...)"
              className="w-full mb-2 p-2 bg-gray-900 border border-gray-700 rounded-md text-sm"
              value={recipientAddr}
              onChange={(e) => setRecipientAddr(e.target.value)}
            />
            <textarea
              placeholder="Recipient PUBLIC KEY (PEM)"
              className="w-full mb-3 p-2 bg-gray-900 border border-gray-700 rounded-md text-sm h-24"
              value={recipientPubPEM}
              onChange={(e) => setRecipientPubPEM(e.target.value)}
            />
            <button
              onClick={grantAccess}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium"
            >
              Grant
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-10 text-sm text-gray-400 italic">{status || "Ready."}</div>
      </main>
    </div>
  );
}
