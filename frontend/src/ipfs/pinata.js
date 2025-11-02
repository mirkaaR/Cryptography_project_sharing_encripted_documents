
function getJwt() {
  const token = (import.meta.env.VITE_PINATA_JWT || "").trim();
  if (!token) {
    throw new Error("❌ Missing VITE_PINATA_JWT in .env file");
  }
  return token;
}


export async function uploadBytes(bytes, name = "encrypted.bin") {
  const jwt = getJwt();

  const form = new FormData();
  const file = new File([bytes], name, { type: "application/octet-stream" });
  form.append("file", file);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name, keyvalues: { app: "secure-storage" } })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });


  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      `❌ Pinata upload failed: ${res.status} ${res.statusText}\n${text}`
    );
  }


  const cid = json?.IpfsHash || json?.cid || json?.value?.cid;
  if (!cid) {
    throw new Error(`⚠️ Missing CID in Pinata response: ${text}`);
  }

  console.log(`✅ Uploaded to IPFS (CID: ${cid})`);
  return cid;
}


export async function downloadToArrayBuffer(cid) {
  const gateways = [
    `https://${cid}.ipfs.dweb.link`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://w3s.link/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
  ];

  const errors = [];
  for (const url of gateways) {
    try {
      const res = await fetch(url, { cache: "no-store", mode: "cors" });
      if (res.ok) {
        console.log(`✅ Fetched from: ${url}`);
        return await res.arrayBuffer();
      }
      errors.push(`${url} → ${res.status} ${res.statusText}`);
    } catch (err) {
      errors.push(`${url} → ${err.message || err}`);
    }
  }

  throw new Error("❌ IPFS fetch failed:\n" + errors.join("\n"));
}
