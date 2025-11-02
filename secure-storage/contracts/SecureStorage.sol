// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SecureStorage {
    struct Document {
        address owner;
        string ipfsCid;
        bytes32 docHash;             // hash enkriptovanog fajla
        uint256 createdAt;
        mapping(address => bool) canAccess;
        mapping(address => bytes) encKeys; // enkriptovani simetrični ključevi po korisniku
        address[] sharedWith;
    }

    uint256 public nextId;
    mapping(uint256 => Document) private documents;
    mapping(address => uint256[]) private ownedDocs;

    event DocumentAdded(
        uint256 indexed docId,
        address indexed owner,
        string ipfsCid,
        bytes32 docHash,
        uint256 timestamp
    );

    event AccessGranted(uint256 indexed docId, address indexed to, bytes encKey);
    event AccessRevoked(uint256 indexed docId, address indexed from);
    event IntegrityChecked(
        uint256 indexed docId,
        address indexed caller,
        bool ok,
        bytes32 providedHash,
        uint256 timestamp
    );

    modifier onlyOwner(uint256 docId) {
        require(documents[docId].owner == msg.sender, "Samo vlasnik moze da upravlja pristupom.");
        _;
    }

    /// @notice Registruje novi dokument i čuva metapodatke
    function registerDocument(
        string calldata ipfsCid,
        bytes32 docHash,
        bytes calldata ownerWrappedKey
    ) external returns (uint256 docId) {
        docId = ++nextId;
        Document storage d = documents[docId];
        d.owner = msg.sender;
        d.ipfsCid = ipfsCid;
        d.docHash = docHash;
        d.createdAt = block.timestamp;

        d.canAccess[msg.sender] = true;
        if (ownerWrappedKey.length > 0) {
            d.encKeys[msg.sender] = ownerWrappedKey;
            d.sharedWith.push(msg.sender);
        }

        ownedDocs[msg.sender].push(docId);

        emit DocumentAdded(docId, msg.sender, ipfsCid, docHash, block.timestamp);
    }

    /// @notice Dodeljuje pristup korisniku i čuva njegov enkriptovani ključ
    function grantAccess(uint256 docId, address to, bytes calldata wrappedKey)
        external
        onlyOwner(docId)
    {
        require(to != address(0), "Nevalidna adresa.");
        Document storage d = documents[docId];
        if (!d.canAccess[to]) {
            d.sharedWith.push(to);
        }
        d.canAccess[to] = true;
        d.encKeys[to] = wrappedKey;

        emit AccessGranted(docId, to, wrappedKey);
    }

    /// @notice Opoziva pristup korisniku
    function revokeAccess(uint256 docId, address from) external onlyOwner(docId) {
        Document storage d = documents[docId];
        require(d.canAccess[from], "Korisnik vec nema pristup.");
        d.canAccess[from] = false;
        delete d.encKeys[from];

        emit AccessRevoked(docId, from);
    }

    /// @notice Proverava da li korisnik ima pristup dokumentu
    function hasAccess(uint256 docId, address user) public view returns (bool) {
        return documents[docId].canAccess[user];
    }

    /// @notice Vraća enkriptovani ključ ako korisnik ima pristup
    function getEncryptedKey(uint256 docId, address user) external view returns (bytes memory) {
        Document storage d = documents[docId];
        require(msg.sender == d.owner || msg.sender == user, "Nemas pravo pristupa ovom dokumentu.");
        require(d.canAccess[user], "Korisnik nema pristup dokumentu.");
        return d.encKeys[user];
    }

    /// @notice Dohvata osnovne metapodatke o dokumentu
    function getMetadata(uint256 docId)
        external
        view
        returns (address owner, string memory ipfsCid, bytes32 docHash, uint256 createdAt)
    {
        Document storage d = documents[docId];
        owner = d.owner;
        ipfsCid = d.ipfsCid;
        docHash = d.docHash;
        createdAt = d.createdAt;
    }

    /// @notice Vraća listu korisnika koji dele dokument
    function getSharedUsers(uint256 docId) external view returns (address[] memory) {
        return documents[docId].sharedWith;
    }

    /// @notice Prikazuje sve dokumente koje je korisnik otpremio
    function listOwnedDocs(address user) external view returns (uint256[] memory) {
        return ownedDocs[user];
    }

    /// @notice Proverava integritet dokumenta na osnovu hash vrednosti
    function verifyIntegrity(uint256 docId, bytes32 providedHash) external returns (bool ok) {
        ok = (documents[docId].docHash == providedHash);
        emit IntegrityChecked(docId, msg.sender, ok, providedHash, block.timestamp);
    }
}
