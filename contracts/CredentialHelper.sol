// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./CredentialFactory.sol";

contract CredentialHelper is CredentialFactory {
    uint rankingFee = 0.002 ether;

    /**
     * @dev This modifier checks if the sender is the issuer of the credential.
     * @param _credentialId The ID of the credential to check the issuer of.
     */
    modifier onlyIssuerOf(uint _credentialId) {
        require(msg.sender == credentialToIssuer[_credentialId]);
        _;
    }

    /**
     * @dev This modifier checks if the sender is the owner of the credential or the issuer of the credential.
     * @param _credentialId The ID of the credential to check the owner of or the issuer of.
     */
    modifier onlyIssuerOrOwnerOf(uint _credentialId) {
        require(
            msg.sender == credentialToIssuer[_credentialId] ||
                msg.sender == credentialToOwner[_credentialId]
        );
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

    function setRankingFee(uint _fee) external onlyOwner {
        rankingFee = _fee;
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
    )
        external
        payable
        onlyIssuerOrOwnerOf(_credentialId)
        canChangeRank(_credentialId)
    {
        if (msg.sender == credentialToOwner[_credentialId]) {
            require(msg.value == rankingFee, "Fee required for owner");
        }

        CredentialRank oldRank = credentials[_credentialId].rank;
        credentials[_credentialId].rank = CredentialRank(
            uint8(credentials[_credentialId].rank) + 1
        );
        emit RankChanged(
            _credentialId,
            oldRank,
            credentials[_credentialId].rank
        );
    }

    /**
     * @dev This function allows the issuer of the credential to directly set the rank to the desired type without requiring a fee.
     * @param _credentialId The ID of the credential to change the rank of.
     * @param _newRank The desired rank to set for the credential.
     */
    function setRankByIssuer(
        uint _credentialId,
        CredentialRank _newRank
    ) external onlyIssuerOf(_credentialId) onlyValidCredentialRank(_newRank) {
        require(
            _newRank != CredentialRank.Diamond,
            "Diamond rank cannot be directly set"
        );

        CredentialRank oldRank = credentials[_credentialId].rank;
        credentials[_credentialId].rank = _newRank;
        emit RankChanged(_credentialId, oldRank, _newRank);
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
