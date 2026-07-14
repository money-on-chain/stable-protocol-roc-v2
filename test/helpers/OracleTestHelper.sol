// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

interface IOracleCheats {
    function addr(uint256 privateKey) external returns (address keyAddr);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function load(address target, bytes32 slot) external view returns (bytes32 data);
}

abstract contract OracleTestHelper {
    struct SignerMaterial {
        address signer;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function _toDynamic(uint256[4] memory input) internal pure returns (uint256[] memory output) {
        output = new uint256[](4);
        for (uint256 i = 0; i < output.length; i++) {
            output[i] = input[i];
        }
    }

    function _toDynamic(uint256[2] memory input) internal pure returns (uint256[] memory output) {
        output = new uint256[](2);
        for (uint256 i = 0; i < output.length; i++) {
            output[i] = input[i];
        }
    }

    function _rotationSignersFromKeys(
        IOracleCheats cheats,
        uint256[] memory privateKeys
    ) internal returns (address[] memory signers) {
        signers = new address[](privateKeys.length);
        for (uint256 i = 0; i < privateKeys.length; i++) {
            signers[i] = cheats.addr(privateKeys[i]);
        }
    }

    function _buildDigest(
        uint256 publishMessageVersion,
        bytes32 coinpair,
        uint256 price,
        address votedOracle,
        uint256 lastPubBlock
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n148",
                    publishMessageVersion,
                    coinpair,
                    price,
                    votedOracle,
                    lastPubBlock
                )
            );
    }

    function _buildSortedSignatures(
        IOracleCheats cheats,
        uint256[] memory privateKeys,
        address[] memory signers,
        bytes32 digest
    ) internal returns (uint8[] memory sigV, bytes32[] memory sigR, bytes32[] memory sigS) {
        require(privateKeys.length == signers.length, "private key/signer length mismatch");

        SignerMaterial[] memory materials = new SignerMaterial[](privateKeys.length);
        for (uint256 i = 0; i < privateKeys.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = cheats.sign(privateKeys[i], digest);
            materials[i] = SignerMaterial({ signer: signers[i], v: v, r: r, s: s });
        }

        for (uint256 i = 0; i < materials.length; i++) {
            for (uint256 j = i + 1; j < materials.length; j++) {
                if (uint160(materials[j].signer) < uint160(materials[i].signer)) {
                    SignerMaterial memory tmp = materials[i];
                    materials[i] = materials[j];
                    materials[j] = tmp;
                }
            }
        }

        sigV = new uint8[](materials.length);
        sigR = new bytes32[](materials.length);
        sigS = new bytes32[](materials.length);
        for (uint256 i = 0; i < materials.length; i++) {
            sigV[i] = materials[i].v;
            sigR[i] = materials[i].r;
            sigS[i] = materials[i].s;
        }
    }

    function _loadAddress(IOracleCheats cheats, address target, bytes32 slot) internal view returns (address) {
        bytes32 value = cheats.load(target, slot);
        return address(uint160(uint256(value)));
    }
}
