const { assert } = require("chai");
const VWBLERC1155 = artifacts.require("VWBLERC1155");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract ("VWBLERC1155 test", async accounts => {
    let vwblERC1155;

    it ("should deploy", async () => {
        vwblERC1155 = await VWBLERC1155.new(
            "http://xxx.zzz.com",
            {from: accounts[0]}
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