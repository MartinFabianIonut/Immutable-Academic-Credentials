// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./Ownable.sol";
import "./SafeMath.sol";

// This contract handles the issuance of academic credentials (certificates, degrees, achievements) onto the blockchain.
contract CredentialFactory is Ownable {
    using SafeMath16 for uint16;

    enum CredentialType {
        Certificate, // Type for certificates
        Degree, // Type for degrees
        Achievement // Type for achievements
    }

    enum CredentialRank {
        Bronze, // Lowest rank
        Silver,
        Gold,
        Platinum,
        Diamond // Highest rank
    }

    event NewCredential(
        uint credentialId,
        string name,
        CredentialType credentialType
    );

    event RankChanged(
        uint credentialId,
        CredentialRank oldRank,
        CredentialRank newRank
    );

    event CredentialChanged(
        uint credentialId,
        string name,
        CredentialType credentialType,
        uint dateIssued,
        uint expirationDate,
        string description,
        string credentialUrl
    );

    struct Credential {
        string name; // Name of the credential
        CredentialType credentialType; // Type of the credential
        uint dateIssued; // Date when the credential was issued
        uint expirationDate; // Expiration date of the credential (0 if it does not expire)
        string description; // Description of the credential
        string credentialUrl; // URL for additional information about the credential
        CredentialRank rank; // Rank of the credential
    }

    Credential[] public credentials; // Array to store all credentials

    mapping(uint => address) public credentialToOwner; // Mapping from credential ID to owner address
    mapping(uint => address) public credentialToIssuer; // Mapping from credential ID to issuer address
    mapping(address => uint16) ownerCredentialCount; // Mapping from owner address to count of owned credentials

    // Mapping for count of credential types owned by each address
    mapping(address => mapping(uint16 => uint16))
        public ownerCredentialTypeCount;

    function _createCredential(
        string memory _name,
        CredentialType _type,
        uint _dateOfIssue,
        uint _expirationDate,
        string memory _description,
        string memory _credentialUrl
    )
        internal
        onlyValidCredentialType(_type) /// Modifier to check if the credential type is valid
        onlyNonExpiredCredential(_expirationDate) /// Modifier to check if the credential is non-expired
    {
        Credential memory credential = Credential(
            _name,
            _type,
            _dateOfIssue,
            _expirationDate,
            _description,
            _credentialUrl,
            CredentialRank.Bronze // Default rank is set to Bronze
        );
        credentials.push(credential);
        uint id = credentials.length - 1;
        credentialToIssuer[id] = msg.sender;
        ownerCredentialCount[msg.sender] = ownerCredentialCount[msg.sender].add(
            1
        );
        ownerCredentialTypeCount[msg.sender][
            uint16(_type)
        ] = ownerCredentialTypeCount[msg.sender][uint16(_type)].add(1);
        emit NewCredential(id, _name, _type);
    }

    // Modifier to check if the credential type is valid
    modifier onlyValidCredentialType(CredentialType _type) {
        require(
            _type == CredentialType.Certificate ||
                _type == CredentialType.Degree ||
                _type == CredentialType.Achievement,
            "Invalid credential type"
        );
        _;
    }

    // Modifier to check if the credential is non-expired
    modifier onlyNonExpiredCredential(uint _expirationDate) {
        require(
            _expirationDate >= block.timestamp || _expirationDate == 0,
            "Credential has expired"
        );
        _;
    }

    // Function to create a new credential with the specified details
    function createCredential(
        string memory _name,
        CredentialType _type,
        uint _dateOfIssue,
        uint _expirationDate,
        string memory _description,
        string memory _credentialUrl
    ) public {
        _createCredential(
            _name,
            _type,
            _dateOfIssue,
            _expirationDate,
            _description,
            _credentialUrl
        );
    }
}
