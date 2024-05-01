// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./CredentialFactory.sol";

contract CredentialHelper is CredentialFactory {
    mapping(uint8 => uint) public rankingFees;

    constructor() public {
        // Set default fees for each rank transition
        rankingFees[uint8(CredentialRank.Bronze)] = 0.002 ether; // Bronze to Silver
        rankingFees[uint8(CredentialRank.Silver)] = 0.0035 ether; // Silver to Gold
        rankingFees[uint8(CredentialRank.Gold)] = 0.0051 ether; // Gold to Platinum
        rankingFees[uint8(CredentialRank.Platinum)] = 0.0077 ether; // Platinum to Diamond
    }

    /**
     * @dev This modifier checks if the sender is the issuer of the credential.
     * @param _credentialId The ID of the credential to check the issuer of.
     */
    modifier onlyIssuerOf(uint _credentialId) {
        require(msg.sender == credentialToIssuer[_credentialId]);
        _;
    }

    /**
     * @dev This modifier checks if the sender is the owner of the credential.
     * @param _credentialId The ID of the credential to check the owner of.
     */
    modifier onlyOwnerOf(uint _credentialId) {
        require(msg.sender == credentialToOwner[_credentialId]);
        _;
    }

    /**
     * @dev This modifier checks if the rank of the credential is not Diamond.
     * @param _credentialId The ID of the credential to check the rank of.
     */
    modifier canChangeRank(uint _credentialId) {
        require(
            credentials[_credentialId].rank != CredentialRank.Diamond,
            "Rank is already Diamond"
        );
        _;
    }

    /**
     * @dev This modifier checks if the credential rank is valid.
     * @param _rank The credential rank to check.
     */
    modifier onlyValidCredentialRank(CredentialRank _rank) {
        require(
            _rank == CredentialRank.Bronze ||
                _rank == CredentialRank.Silver ||
                _rank == CredentialRank.Gold ||
                _rank == CredentialRank.Platinum ||
                _rank == CredentialRank.Diamond,
            "Invalid credential rank"
        );
        _;
    }

    function changeName(
        uint _credentialId,
        string memory _newName
    ) private onlyIssuerOf(_credentialId) {
        credentials[_credentialId].name = _newName;
    }

    function changeCredentialType(
        uint _credentialId,
        CredentialType _newType
    ) private onlyIssuerOf(_credentialId) onlyValidCredentialType(_newType) {
        credentials[_credentialId].credentialType = _newType;
    }

    function changeDateIssued(
        uint _credentialId,
        uint _newDateIssued
    ) private onlyIssuerOf(_credentialId) {
        credentials[_credentialId].dateIssued = _newDateIssued;
    }

    function changeExpirationDate(
        uint _credentialId,
        uint _newExpirationDate
    )
        private
        onlyIssuerOf(_credentialId)
        onlyNonExpiredCredential(_newExpirationDate)
    {
        credentials[_credentialId].expirationDate = _newExpirationDate;
    }

    function changeDescription(
        uint _credentialId,
        string memory _newDescription
    ) private onlyIssuerOf(_credentialId) {
        credentials[_credentialId].description = _newDescription;
    }

    function changeCredentialUrl(
        uint _credentialId,
        string memory _newCredentialUrl
    ) private onlyIssuerOf(_credentialId) {
        credentials[_credentialId].credentialUrl = _newCredentialUrl;
    }

    function changeCredential(
        uint _credentialId,
        string calldata _newName,
        CredentialType _newType,
        uint _newDateIssued,
        uint _newExpirationDate,
        string calldata _newDescription,
        string calldata _newCredentialUrl
    ) external onlyIssuerOf(_credentialId) {
        changeName(_credentialId, _newName);
        changeCredentialType(_credentialId, _newType);
        changeDateIssued(_credentialId, _newDateIssued);
        changeExpirationDate(_credentialId, _newExpirationDate);
        changeDescription(_credentialId, _newDescription);
        changeCredentialUrl(_credentialId, _newCredentialUrl);
        emit CredentialChanged(
            _credentialId,
            _newName,
            _newType,
            _newDateIssued,
            _newExpirationDate,
            _newDescription,
            _newCredentialUrl
        );
    }

    /**
     * @dev This function is can be called by the owner of the credential to change the rank of the credential or by the issuer of the credential.
     * The rank can only be changed if the rank is not already Diamond.
     * The function requires the caller to send the ranking fee in order to change the rank if the caller is the owner.
     * The function allows the issuer to directly set the rank without paying the fee.
     * The function increments the rank of the credential by one.
     * @param _credentialId The ID of the credential to change the rank of.
     */
    function changeRank(
        uint _credentialId
    ) external payable onlyOwnerOf(_credentialId) canChangeRank(_credentialId) {
        address owner = credentialToOwner[_credentialId];

        Credential storage credential = credentials[_credentialId];
        uint8 currentRank = uint8(credential.rank);

        uint fee = rankingFees[currentRank];
        if (msg.sender == owner) {
            require(msg.value == fee, "Fee required for owner");
        }

        uint8 oldRank = uint8(credentials[_credentialId].rank);
        credentials[_credentialId].rank = CredentialRank(oldRank + 1);

        uint16 credentialRank = uint16(credentials[_credentialId].rank);
        ownerCredentialRankCount[owner][
            credentialRank
        ] = ownerCredentialRankCount[owner][credentialRank].add(1);
        ownerCredentialRankCount[owner][oldRank] = ownerCredentialRankCount[
            owner
        ][oldRank].sub(1);

        emit RankChanged(
            _credentialId,
            CredentialRank(oldRank),
            credentials[_credentialId].rank
        );
    }

    /**
     * @dev This function returns all the credentials owned by a given address.
     * @param _owner The address to query the credentials of.
     * @return An array of credential IDs owned by the address.
     */
    function getCredentialsByOwner(
        address _owner
    ) external view returns (uint[] memory) {
        uint[] memory result = new uint[](ownerCredentialCount[_owner]);
        uint counter = 0;
        for (uint i = 0; i < credentials.length; i++) {
            if (credentialToOwner[i] == _owner) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }

    /**
     * @dev This function returns all the credentials issued by a given address.
     * @param _issuer The address to query the credentials of.
     * @return An array of credential IDs issued by the address.
     */
    function getCredentialsByIssuer(
        address _issuer
    ) external view returns (uint[] memory) {
        uint[] memory result = new uint[](issuerCredentialCount[_issuer]);
        uint counter = 0;
        for (uint i = 0; i < credentials.length; i++) {
            if (credentialToIssuer[i] == _issuer) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }
}
