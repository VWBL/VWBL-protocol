const { assert } = require("chai");
const VWBLERC1155 = artifacts.require("VWBLERC1155");
const TransferVWBLERC1155 = artifacts.require("TransferVWBLERC1155");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract ("VWBLERC1155 test", async accounts => {
    let vwblERC1155;
    let transferVWBLERC1155;

    it ("should deploy", async () => {
        vwblERC1155 = await VWBLERC1155.new(
            "http://xxx.zzz.com",
            {from: accounts[0]}
        );
        transferVWBLERC1155 = await TransferVWBLERC1155.new(
            vwblERC1155.address
        );

        const INTERFACE_ID_ERC2981 = "0x2a55205a";
        const supported = await vwblERC1155.supportsInterface(INTERFACE_ID_ERC2981);
        assert.equal(supported, true);
    });

    it ("should mint nft", async () => {
        await vwblERC1155.mint(
            "http://xxx.yyy.com",
            100, // token amount
            500, // royalty = 5%
            { from: accounts[1] }
        );
        const tokens = await vwblERC1155.getTokenByMinter(accounts[1]);
        assert.equal(
            tokens[0].minterAddress,
            accounts[1],
            "Minter is not correct"
        );
        assert.equal(
            tokens[0].getKeyURl,
            'http://xxx.yyy.com',
            "keyURL is not correct"
        );

        const tokenAmount = await vwblERC1155.balanceOf(accounts[1], 1);
        assert.equal(
            tokenAmount,
            100
        );

        const royaltyInfo = await vwblERC1155.tokenIdToRoyaltyInfo(1);
        assert.equal(
            royaltyInfo.recipient,
            accounts[1]
        );
        assert.equal(
            royaltyInfo.royaltiesPercentage,
            500
        );
    });

    it ("should mint multiple nfts", async () => {
        await vwblERC1155.mint(
            "http://xxx.yyy.zzz.com",
            200, // token amount
            500, // royalty = 5%
            { from: accounts[1] }
        );
        const tokens = await vwblERC1155.getTokenByMinter(accounts[1]);
        assert.equal(
            tokens[1].minterAddress,
            accounts[1],
            "Minter is not correct"
        );
        assert.equal(
            tokens[1].getKeyURl,
            'http://xxx.yyy.zzz.com',
            "keyURL is not correct"
        );

        const tokenAmount = await vwblERC1155.balanceOf(accounts[1], 2);
        assert.equal(
            tokenAmount,
            200
        );

        const royaltyInfo = await vwblERC1155.tokenIdToRoyaltyInfo(2);
        assert.equal(
            royaltyInfo.recipient,
            accounts[1]
        );
        assert.equal(
            royaltyInfo.royaltiesPercentage,
            500
        );
    });

    it ("should get tokens of owner after mint", async () => {
        const tokenCountOfOwner = await vwblERC1155._tokenCountOfOwner(accounts[1]);
        assert.equal(
            tokenCountOfOwner,
            2
        );

        for (i = 0; i < tokenCountOfOwner; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1], i);
            console.log("     accounts[1] has tokenId =", tokenId.toString(), "nft");
        }
    });

    it ("should transfer", async () => {
        await vwblERC1155.setApprovalForAll(transferVWBLERC1155.address, true, {from: accounts[1]});
        await transferVWBLERC1155.transferERC1155(accounts[2], 1, 10, {from: accounts[1]});
        
        const tokenAmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1], 1);
        assert.equal(
            tokenAmountOfOwner1,
            90
        );

        const tokenAmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2], 1);
        assert.equal(
            tokenAmountOfOwner2,
            10
        );
    });

    it ("should batch transfer", async () => {
        await transferVWBLERC1155.batchTransferERC1155(accounts[2], [1, 2], [90, 10], {from: accounts[1]});
        
        const token1AmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1], 1);
        assert.equal(
            token1AmountOfOwner1,
            0
        );
        const token2AmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1], 2);
        assert.equal(
            token2AmountOfOwner1,
            190
        );

        const token1AmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2], 1);
        assert.equal(
            token1AmountOfOwner2,
            100
        );
        const token2AmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2], 2);
        assert.equal(
            token2AmountOfOwner2,
            10
        );
    });

    it ("should get tokens of owner after transfer", async () => {
        const tokenCountOfOwner1 = await vwblERC1155._tokenCountOfOwner(accounts[1]);
        assert.equal(
            tokenCountOfOwner1,
            1
        );

        for (i = 0; i < tokenCountOfOwner1; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1], i);
            console.log("     accounts[1] has tokenId =", tokenId.toString(), "nft");
        }

        const tokenCountOfOwner2 = await vwblERC1155._tokenCountOfOwner(accounts[2]);
        assert.equal(
            tokenCountOfOwner2,
            2
        );

        for (i = 0; i < tokenCountOfOwner2; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[2], i);
            console.log("     accounts[2] has tokenId =", tokenId.toString(), "nft");
        }
    });

    it ("should not set BaseURI from not contract owner", async () => {
        await expectRevert(
            vwblERC1155.setBaseURI("http://xxx.com", {from: accounts[2]}),
            "Ownable: caller is not the owner"
        );
    });

    it ("should set BaseURI from contract owner", async () => {
        await vwblERC1155.setBaseURI("http://xxx.com", {from: accounts[0]});
        const baseURI = await vwblERC1155.uri(1);
        assert.equal(
            baseURI,
            "http://xxx.com"
        );
    });
});