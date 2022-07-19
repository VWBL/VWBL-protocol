const { assert } = require("chai");
const VWBLERC1155 = artifacts.require("VWBLERC1155");
const VWBLGateway = artifacts.require("VWBLGateway");
const AccessControlCheckerByERC1155 = artifacts.require("AccessControlCheckerByERC1155");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract ("VWBLERC1155 test", async accounts => {
    let vwblGateway;
    let accessControlCheckerByERC1155;
    let vwblERC1155;

    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000";
    
    it ("should deploy", async () => {
        vwblGateway = await VWBLGateway.new(web3.utils.toWei("1", "ether"), { from: accounts[0] })
        accessControlCheckerByERC1155 = await AccessControlCheckerByERC1155.new(vwblGateway.address, { from: accounts[0] })
        vwblERC1155 = await VWBLERC1155.new(
            "http://xxx.zzz.com",
            vwblGateway.address,
            accessControlCheckerByERC1155.address,
            {from: accounts[0]}
        );

        const INTERFACE_ID_ERC2981 = "0x2a55205a";
        const supported = await vwblERC1155.supportsInterface(INTERFACE_ID_ERC2981);
        assert.equal(supported, true);
    });

    it("should return false from hasAccessControl", async () => {
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    it ("should mint nft", async () => {
        await vwblERC1155.mint(
            "http://xxx.yyy.com",
            100, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID1,
            { 
                value: web3.utils.toWei("1", "ether"),
                from: accounts[1]
            }
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

        console.log("     accounts[1] mint tokenId = 1, amount =", tokenAmount.toString(), " nft");
    
        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID1);
        assert.equal(createdToken.contractAddress, vwblERC1155.address);

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID1);
        assert.equal(isPermitted, true);
    });

    it ("should get nft datas", async () => {
        const erc1155Datas = await accessControlCheckerByERC1155.getERC1155Datas();
        assert.equal(erc1155Datas[0][0], TEST_DOCUMENT_ID1)
        assert.equal(erc1155Datas[1][0].contractAddress, vwblERC1155.address.toString());
        assert.equal(erc1155Datas[1][0].tokenId, '1');
    })

    it ("should mint multiple nfts", async () => {
        await vwblERC1155.mint(
            "http://xxx.yyy.zzz.com",
            200, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID2,
            { 
                value: web3.utils.toWei("1", "ether"),
                from: accounts[1]
            }
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

        console.log("     accounts[1] mint tokenId = 2, amount =", tokenAmount.toString(), " nft");
    
        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID2);
        assert.equal(createdToken.contractAddress, vwblERC1155.address);

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID2);
        assert.equal(isPermitted, true);
    });

    it ("should get tokens of owner after mint", async () => {
        const tokenCountOfOwner = await vwblERC1155.tokenCountOfOwner(accounts[1]);
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
        await vwblERC1155.safeTransferFrom(accounts[1], accounts[2], 1, 10, '0x0', {from: accounts[1]});

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

        console.log("     accounts[1] transfer tokenId = 1 and amount = 10 to accounts[2]");
    
        const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID1);
        assert.equal(isPermitted, true);
    });

    it ("should batch transfer", async () => {
        await vwblERC1155.safeBatchTransferFrom(accounts[1], accounts[2], [1, 2], [90, 10], '0x0', {from: accounts[1]});
        
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

        console.log("     accounts[1] transfer tokenId = 1 and amount = 90 to accounts[2]");
        console.log("     accounts[1] transfer tokenId = 2 and amount = 10 to accounts[2]");
    });

    it ("should get tokens of owner after transfer", async () => {
        const tokenCountOfOwner1 = await vwblERC1155.tokenCountOfOwner(accounts[1]);
        assert.equal(
            tokenCountOfOwner1,
            1
        );

        for (i = 0; i < tokenCountOfOwner1; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1], i);
            console.log("     accounts[1] has tokenId =", tokenId.toString(), "nft");
        }

        const tokenCountOfOwner2 = await vwblERC1155.tokenCountOfOwner(accounts[2]);
        assert.equal(
            tokenCountOfOwner2,
            2
        );

        for (i = 0; i < tokenCountOfOwner2; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[2], i);
            console.log("     accounts[2] has tokenId =", tokenId.toString(), "nft");
        }
    });

    it ("should batch mint nft", async () => {
        await vwblERC1155.mintBatch(
            "http://aaa.yyy.zzz.com",
            [100, 200],
            [500, 500],
            [TEST_DOCUMENT_ID3, TEST_DOCUMENT_ID4],
            {
                value: web3.utils.toWei("2", "ether"),
                from: accounts[1]
            }
        );

        console.log("     accounts[1] mint tokenId = 3 , amount = 100 nft");
        console.log("     accounts[1] mint tokenId = 4 , amount = 200 nft");

        const isPermittedOfId3 = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID3);
        assert.equal(isPermittedOfId3, true);

        const isPermittedOfId4 = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID4);
        assert.equal(isPermittedOfId4, true);
    });

    it ("should get tokens of owner after batch mint", async () => {
        const tokenCountOfOwner1 = await vwblERC1155.tokenCountOfOwner(accounts[1]);
        assert.equal(
            tokenCountOfOwner1,
            3
        );

        for (i = 0; i < tokenCountOfOwner1; i++) {
            const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1], i);
            console.log("     accounts[1] has tokenId =", tokenId.toString(), "nft");
        }
    })

    it ("should not set VWBLGateway contract from not contract owner", async () => {
        await expectRevert(
          accessControlCheckerByERC1155.setVWBLGateway(accounts[4], {
            from: accounts[1],
          }),
          "Ownable: caller is not the owner"
        )
    
        await expectRevert(
          vwblERC1155.setGatewayContract(accounts[5], {
            from: accounts[1],
          }),
          "Ownable: caller is not the owner"
        )
    })
    
    it ("should set VWBLGateway contract from contract owner", async () => {
        await accessControlCheckerByERC1155.setVWBLGateway(accounts[4], { from: accounts[0] });
        let newContract = await accessControlCheckerByERC1155.vwblGateway();
        assert.equal(newContract, accounts[4]);
    
        await vwblERC1155.setGatewayContract(accounts[5], { from: accounts[0] });
        newContract = await vwblERC1155.gatewayContract();
        assert.equal(newContract, accounts[5]);
    })

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

    it("should not set Access check contract from not contract owner", async () => {
        await expectRevert(
          vwblERC1155.setAccessCheckerContract(accounts[4], {
            from: accounts[1]
          }),
          "Ownable: caller is not the owner"
        )
    })
    
    it("should set Access check contract from contract owner", async () => {
        await vwblERC1155.setAccessCheckerContract(accounts[4], { from: accounts[0] });
        const newContract = await vwblERC1155.accessCheckerContract();
        assert.equal(newContract, accounts[4]);
    })
});