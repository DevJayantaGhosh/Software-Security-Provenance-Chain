// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.9.0;

/**
 * @title  ProductRegistry — Software Security Provenance Chain
 * @author Jayanta Ghosh | IIT Madras | CS23M513
 * @dev    Immutable on-chain provenance for software products.
 *         Records three lifecycle stages: SCAN -> SIGN -> RELEASE.
 *         Deployed on Hedera Testnet (Chain ID 296).
 *
 * @dev    Restrictions enforced in recordProduct():
 *         R1  productId not empty
 *         R2  name not empty
 *         R3  version not empty
 *         R4  reposJson not empty
 *         R5  Stage order: count 0->SCAN, 1->SIGN, 2->RELEASE
 *         R6  SIGN must have both IPFS files
 *         R7  SCAN/RELEASE must NOT have IPFS files
 *         R8  Status must match stage (SCAN->Approved|Rejected, SIGN->Signed, RELEASE->Released)
 *         R9  Max 3 snapshots (approved path) or max 1 (rejected path)
 *         R10 Only service accounts can record
 *         R11 If SCAN was Rejected -> block all future records
 */
contract ProductRegistry {

    // ──────────────────────────────────────────────────
    //  ENUMS
    // ──────────────────────────────────────────────────

    enum Stage { SCAN, SIGN, RELEASE }   // 0, 1, 2

    // ──────────────────────────────────────────────────
    //  STRUCTS
    // ──────────────────────────────────────────────────

    struct ProductSnapshot {
        // Identity
        string  productId;
        string  name;
        string  version;
        bool    isOpenSource;
        string  description;

        // Stakeholders
        string  productDirector;
        string  securityHead;
        string  releaseEngineers;   // comma-separated

        // Technical
        string  reposJson;          // JSON.stringify(repos[]) — full scan data
        string  dependencies;       // comma-separated

        // Workflow
        string  status;             // "Approved"|"Rejected"|"Signed"|"Released"
        string  remark;
        Stage   stage;              // SCAN=0, SIGN=1, RELEASE=2

        // IPFS (only at SIGN stage)
        string  signatureFileIPFS;  // "ipfs://Qm..." or ""
        string  publicKeyFileIPFS;  // "ipfs://Qm..." or ""

        // Audit (set automatically)
        string  createdBy;          // username who triggered the recording
        uint256 timestamp;          // block.timestamp
        address recordedBy;         // msg.sender (service account)
    }

    // ──────────────────────────────────────────────────
    //  STATE
    // ──────────────────────────────────────────────────
    //  Lifecycle flow per product:
    //    Approved path:  [0] SCAN(Approved) -> [1] SIGN(Signed) -> [2] RELEASE(Released)
    //    Rejected path:  [0] SCAN(Rejected) -> BLOCKED (R11)
    //
    // ──────────────────────────────────────────────────

    address public owner;

    /// @dev Addresses authorized to call recordProduct()
    mapping(address => bool) public serviceAccounts;

    /// @dev productId -> number of snapshots recorded (0-3)
    mapping(string => uint256) public snapshotCount;

    /// @dev productId -> index -> snapshot
    mapping(string => mapping(uint256 => ProductSnapshot)) private _snapshots;

    // ──────────────────────────────────────────────────
    //  EVENTS
    // ──────────────────────────────────────────────────

    event ProductRecorded(
        string indexed productId,
        Stage   stage,
        string  status,
        address recordedBy,
        uint256 timestamp
    );

    event ServiceAccountAdded(address indexed account);
    event ServiceAccountRemoved(address indexed account);

    // ──────────────────────────────────────────────────
    //  MODIFIERS
    // ──────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyServiceAccount() {
        require(serviceAccounts[msg.sender], "Not a service account"); 
        _;
    }

    // ──────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ──────────────────────────────────────────────────
    //  SERVICE ACCOUNT MANAGEMENT (Admin owner only)
    // ──────────────────────────────────────────────────

    function addServiceAccount(address _account) external onlyOwner {
        require(_account != address(0), "Zero address");
        serviceAccounts[_account] = true;
        emit ServiceAccountAdded(_account);
    }

    function removeServiceAccount(address _account) external onlyOwner {
        serviceAccounts[_account] = false;
        emit ServiceAccountRemoved(_account);
    }

    // ──────────────────────────────────────────────────
    //  CORE: RECORD PRODUCT SNAPSHOT
    // ──────────────────────────────────────────────────

    /**
     * @dev Record a product lifecycle snapshot on-chain.
     * @param metadata The ProductSnapshot data (timestamp & recordedBy set automatically).
     */
    function recordProduct(ProductSnapshot memory metadata)
        external
        onlyServiceAccount                                                      
    {
        // Required fields
        require(bytes(metadata.productId).length > 0,   "productId required");  
        require(bytes(metadata.name).length > 0,         "name required");       
        require(bytes(metadata.version).length > 0,      "version required");    
        require(bytes(metadata.reposJson).length > 0,    "reposJson required");  

        uint256 currentCount = snapshotCount[metadata.productId];

        // If previously rejected, block everything ──
        if (currentCount > 0) {
            require(
                keccak256(bytes(_snapshots[metadata.productId][0].status)) !=
                keccak256(bytes("Rejected")),
                "Product was already 'Rejected', no further action"                            
            );
        }

        // Stage ordering 
        if (currentCount == 0) {
            require(metadata.stage == Stage.SCAN,    "First record must be SCAN");    
        } else if (currentCount == 1) {
            require(metadata.stage == Stage.SIGN,    "Second record must be SIGN");   
        } else if (currentCount == 2) {
            require(metadata.stage == Stage.RELEASE, "Third record must be RELEASE"); 
        }

        // Max snapshots 
        require(currentCount < 3, "Max snapshots reached");                     

        // Status must match stage ──
        if (metadata.stage == Stage.SCAN) {
            require(
                keccak256(bytes(metadata.status)) == keccak256(bytes("Approved")) ||
                keccak256(bytes(metadata.status)) == keccak256(bytes("Rejected")),
                "SCAN status must be Approved or Rejected"                       
            );
        } else if (metadata.stage == Stage.SIGN) {
            require(
                keccak256(bytes(metadata.status)) == keccak256(bytes("Signed")),
                "SIGN status must be Signed"                                     
            );
        } else if (metadata.stage == Stage.RELEASE) {
            require(
                keccak256(bytes(metadata.status)) == keccak256(bytes("Released")),
                "RELEASE status must be Released"                                
            );
        }

        // SIGN must have both IPFS files 
        if (metadata.stage == Stage.SIGN) {
            require(
                bytes(metadata.signatureFileIPFS).length > 0,
                "SIGN requires signatureFileIPFS"                                
            );
            require(
                bytes(metadata.publicKeyFileIPFS).length > 0,
                "SIGN requires publicKeyFileIPFS"                                
            );
        }

        // SCAN & RELEASE must NOT have IPFS files ──
        if (metadata.stage == Stage.SCAN || metadata.stage == Stage.RELEASE) {
            require(
                bytes(metadata.signatureFileIPFS).length == 0,
                "SCAN/RELEASE must not have signatureFileIPFS"                  
            );
            require(
                bytes(metadata.publicKeyFileIPFS).length == 0,
                "SCAN/RELEASE must not have publicKeyFileIPFS"                   
            );
        }

        // ── Store snapshot ──
        metadata.timestamp  = block.timestamp;
        metadata.recordedBy = msg.sender;

        _snapshots[metadata.productId][currentCount] = metadata;
        snapshotCount[metadata.productId] = currentCount + 1;

        emit ProductRecorded(
            metadata.productId,
            metadata.stage,
            metadata.status,
            msg.sender,
            block.timestamp
        );
    }

    // ──────────────────────────────────────────────────
    //  READERS (public / view)
    // ──────────────────────────────────────────────────

    /**
     * @dev Get a specific snapshot for a product.
     * @param productId The product identifier.
     * @param index     The snapshot index (0=SCAN, 1=SIGN, 2=RELEASE).
     */
    function getSnapshot(string memory productId, uint256 index)
        external
        view
        returns (ProductSnapshot memory)
    {
        require(index < snapshotCount[productId], "Snapshot does not exist");
        return _snapshots[productId][index];
    }

    /**
     * @dev Get all recorded snapshots for a product (up to 3: SCAN, SIGN, RELEASE).
     *      Returns an array whose length equals the number of snapshots recorded so far.
     * @param productId The product identifier.
     * @return snapshots Array of ProductSnapshot structs in stage order
     *         index 0 = SCAN, index 1 = SIGN, index 2 = RELEASE (if they exist).
     */
    function getAllSnapshotsByProductId(string memory productId)
        external
        view
        returns (ProductSnapshot[] memory)
    {
        uint256 count = snapshotCount[productId];
        ProductSnapshot[] memory result = new ProductSnapshot[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _snapshots[productId][i];
        }
        return result;
    }

    /**
     * @dev Get total number of snapshots recorded for a product.
     * @param productId The product identifier.
     */
    function getSnapshotCount(string memory productId)
        external
        view
        returns (uint256)
    {
        return snapshotCount[productId];
    }
}
