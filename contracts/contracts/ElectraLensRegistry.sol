// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ElectraLens publication registry
/// @notice Append-only record of publication manifest hashes, one chain per series.
/// Entries can be added and retracted, never changed or removed, and the contract is not
/// upgradeable, so no key holder can rewrite history after the fact.
/// @dev What this proves: that the holder of PUBLISHER_ROLE recorded a manifest hash at a block
/// time, after the previous one in its series. What it doesn't prove: that the data behind the
/// manifest is true or complete. Only hashes and opaque series ids are stored, never personal data.
contract ElectraLensRegistry is AccessControl {
    /// @notice Role allowed to anchor and retract. Held by the anchor service's hot wallet.
    /// DEFAULT_ADMIN_ROLE stays with an offline wallet that can revoke and rotate it.
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    struct Entry {
        bytes32 manifestHash;
        bytes32 previous;
        uint64 timestamp;
        address publisher;
    }

    mapping(bytes32 seriesId => Entry[]) private _entries;
    /// @notice Series each anchored manifest belongs to (zero when never anchored).
    mapping(bytes32 manifestHash => bytes32 seriesId) public seriesOf;
    mapping(bytes32 manifestHash => bool) public retracted;

    event Anchored(
        bytes32 indexed seriesId,
        uint256 indexed sequence,
        bytes32 indexed manifestHash,
        bytes32 previous,
        address publisher
    );
    event Retracted(bytes32 indexed seriesId, bytes32 indexed manifestHash, bytes32 reasonHash, address publisher);

    error ZeroAddress();
    error EmptyHash();
    error AlreadyAnchored(bytes32 manifestHash);
    error UnexpectedPrevious(bytes32 expected, bytes32 actual);
    error NotAnchoredInSeries(bytes32 seriesId, bytes32 manifestHash);
    error AlreadyRetracted(bytes32 manifestHash);
    error NoSuchEntry(bytes32 seriesId, uint256 sequence);

    constructor(address admin, address publisher) {
        if (admin == address(0) || publisher == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PUBLISHER_ROLE, publisher);
    }

    /// @notice Appends a manifest hash to its series.
    /// @param expectedPrevious The series' current latest hash (zero for the first entry). Two
    /// publishers racing, or a stale caller, fail here instead of forking the series.
    /// @return sequence The 1-based position in the series, equal to the manifest's sequence.
    function anchor(bytes32 seriesId, bytes32 manifestHash, bytes32 expectedPrevious)
        external
        onlyRole(PUBLISHER_ROLE)
        returns (uint256 sequence)
    {
        if (seriesId == bytes32(0) || manifestHash == bytes32(0)) revert EmptyHash();
        if (seriesOf[manifestHash] != bytes32(0)) revert AlreadyAnchored(manifestHash);
        bytes32 current = latest(seriesId);
        if (current != expectedPrevious) revert UnexpectedPrevious(expectedPrevious, current);

        Entry[] storage list = _entries[seriesId];
        list.push(Entry(manifestHash, current, uint64(block.timestamp), msg.sender));
        seriesOf[manifestHash] = seriesId;
        sequence = list.length;
        emit Anchored(seriesId, sequence, manifestHash, current, msg.sender);
    }

    /// @notice Marks an anchored manifest as retracted. The entry itself stays in the series.
    /// @param reasonHash Hash of the published retraction reason (the text stays off-chain).
    function retract(bytes32 seriesId, bytes32 manifestHash, bytes32 reasonHash) external onlyRole(PUBLISHER_ROLE) {
        if (reasonHash == bytes32(0)) revert EmptyHash();
        if (seriesId == bytes32(0) || seriesOf[manifestHash] != seriesId) {
            revert NotAnchoredInSeries(seriesId, manifestHash);
        }
        if (retracted[manifestHash]) revert AlreadyRetracted(manifestHash);
        retracted[manifestHash] = true;
        emit Retracted(seriesId, manifestHash, reasonHash, msg.sender);
    }

    /// @notice Latest manifest hash in a series, or zero if the series is empty.
    function latest(bytes32 seriesId) public view returns (bytes32) {
        Entry[] storage list = _entries[seriesId];
        return list.length == 0 ? bytes32(0) : list[list.length - 1].manifestHash;
    }

    /// @notice Number of entries in a series.
    function count(bytes32 seriesId) external view returns (uint256) {
        return _entries[seriesId].length;
    }

    /// @notice Entry at a 1-based sequence number.
    function entry(bytes32 seriesId, uint256 sequence) external view returns (Entry memory) {
        Entry[] storage list = _entries[seriesId];
        if (sequence == 0 || sequence > list.length) revert NoSuchEntry(seriesId, sequence);
        return list[sequence - 1];
    }

    /// @notice True once a manifest hash has been anchored in any series.
    function anchored(bytes32 manifestHash) external view returns (bool) {
        return seriesOf[manifestHash] != bytes32(0);
    }
}
