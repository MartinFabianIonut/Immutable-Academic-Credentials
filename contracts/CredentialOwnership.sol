// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./CredentialHelper.sol";
import "./ERC721.sol";

contract CredentialOwnership is CredentialHelper, ERC721 {
    mapping(uint => address) credentialApprovals;

    /**
     * @dev Returns the number of credentials owned by a specific address.
     * @param _owner The owner address to check
     * @return uint256 representing the number of credentials owned by the passed address
     */
    function balanceOf(address _owner) external view returns (uint256) {
        return ownerCredentialCount[_owner];
    }

    /**
     * @dev Returns the owner of the credential with the given ID.
     * @param _tokenId The ID of the credential to query the owner of
     * @return the owner of the credential
     */
    function ownerOf(uint256 _tokenId) external view returns (address) {
        return credentialToOwner[_tokenId];
    }

    /**
     * @dev Transfers the ownership of a given credential ID to another address.
     * Only the issuer of the credential or an approved address can transfer
     * a credential.
     * @param _from The current owner of the credential (aka issuer)
     * @param _to The new owner (aka employee)
     * @param _tokenId The credential ID to transfer
     */
    function _transfer(address _from, address _to, uint256 _tokenId) private {
        ownerCredentialCount[_to] = ownerCredentialCount[_to].add(1);
        uint16 credentialRank = uint16(credentials[_tokenId].rank);
        ownerCredentialRankCount[_to][
            credentialRank
        ] = ownerCredentialRankCount[_to][credentialRank].add(1);
        credentialToOwner[_tokenId] = _to;
        emit Transfer(_from, _to, _tokenId);
    }

    /**
     * @dev Transfers the ownership of a given credential ID to another address.
     *  Only the issuer of the credential or an approved address can transfer
     *  a credential.
     * @param _from The current owner of the credential (aka issuer)
     * @param _to The new owner (aka employee)
     * @param _tokenId The credential ID to transfer
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external payable {
        require(
            credentialToIssuer[_tokenId] == msg.sender ||
                credentialApprovals[_tokenId] == msg.sender
        );
        _transfer(_from, _to, _tokenId);
    }

    /**
     * @dev Approves another address to transfer the given credential ID
     * The zero address indicates there is no approved address.
     * There can only be one approved address per credential at a time.
     * Can only be called by the issuer of the credential.
     * @param _approved The new approved person that can transfer the credential to himself
     * @param _tokenId The credential that is being approved
     */
    function approve(
        address _approved,
        uint256 _tokenId
    ) external payable onlyIssuerOf(_tokenId) {
        credentialApprovals[_tokenId] = _approved;
        emit Approval(msg.sender, _approved, _tokenId);
    }
}
