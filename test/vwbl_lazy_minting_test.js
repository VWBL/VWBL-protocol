const { assert } = require("chai");
const hardhat = require("hardhat");
const { LazyMinter } = require("../lib/index");
const { ethers } = hardhat;
const VWBLGateway = artifacts.require("VWBLGateway");
const transferVWBLNFT = artifacts.require("TransferVWBLNFT");
const lazyVWBL = artifacts.require("VWBLLazyMinting");
const market = artifacts.require("Market");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract ("VWBLLazyMinting test", async accounts => {
    let signer;
    let signerAddress;
    let invalidSigner;
    let transferVWBLNFTContract;
    let vwblGateway;
    let lazyVWBLContract;
    let marketContract;
    let chainId;
    const TEST_DOCUMENT_ID1 = "0x7c00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID2 = "0x3c00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID3 = "0x6c00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID4 = "0x1c00000000000000000000000000000000000000000000000000000000000000";
    const TEST_DOCUMENT_ID5 = "0x2c00000000000000000000000000000000000000000000000000000000000000";
    const randomString1 = 'D9A9C87D-A09E-40F1-A7B0-6D14F8C3D2A3';
    const randomString2 = 'A9A9C87D-A09E-40F1-A7B0-6D14F8C3D2A3';
    const SupportInterfaces = [
        "0x80ac58cd", // INTERFACE_ID_ERC721
        "0x2a55205a", // INTERFACE_ID_ERC2981
      ];

    it ("should deploy", async () => {
        const [_signer, _invalidSigner, _] = await ethers.getSigners();
        signer = _signer;
        invalidSigner = _invalidSigner;
        signerAddress = await signer.getAddress();
        vwblGateway = await VWBLGateway.new(web3.utils.toWei("1", "ether"), { from: accounts[0] });
        lazyVWBLContract = await lazyVWBL.new(
            signerAddress, 
            "http://xxx.zzz.com",
            vwblGateway.address,
            {
                from: accounts[0],
            }
        );
        let _chainId =  await lazyVWBLContract.getChainID();
        chainId = _chainId.toNumber();

        SupportInterfaces.forEach(async (interface) => {
            const supported = await lazyVWBLContract.supportsInterface(interface);
            assert.equal(supported, true);
        });

        transferVWBLNFTContract = await transferVWBLNFT.new();

        marketContract = await market.new(lazyVWBLContract.address);
    })

    it ("should mint nft", async () => {
        await lazyVWBLContract.mint(
            "http://xxx.yyy.com", 
            500, 
            TEST_DOCUMENT_ID1,
            { 
                from: accounts[1],
                value: web3.utils.toWei("1", "ether"), 
            }
        );
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
        assert.equal(tokens[0], 1);
    });
    
    it ("should mint multiple nfts", async () => {
        await lazyVWBLContract.mint(
            "http://xxx.yyy.zzz.com", 
            500, 
            TEST_DOCUMENT_ID2,
            { 
                from: accounts[1],
                value: web3.utils.toWei("1", "ether"),
            }
        );
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
        assert.equal(tokens[1], 2);
    });

    it ("should transfer VWBLNFT", async function () {
        await lazyVWBLContract.setApprovalForAll(transferVWBLNFTContract.address, true, {from: accounts[1]});
        await transferVWBLNFTContract.transferNFT(lazyVWBLContract.address, accounts[2], 1, { from: accounts[1] });
        const nftOwnerOfId1 = await lazyVWBLContract.ownerOf(1);
        assert.equal(
            nftOwnerOfId1,
            accounts[2],
            "accounts[2] is not received NFT"
        );
    });

    it ("should redeem an NFT from a valid signer voucher", async function() {
        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: signer,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            TEST_DOCUMENT_ID3, // documentId
            randomString1, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            marketContract.address,
            web3.utils.toWei("2", "ether") // sellPrice
        );
        await lazyVWBLContract.redeem(
            accounts[2], // redeemer
            voucher,
            { value: web3.utils.toWei("3", "ether")}, // sellPrice + vwbl fee
        ).then( r => {
            r.logs.forEach(e => {
                console.log("     emit", e.event);
            });
        });
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
        assert.equal(tokens[2], 3);

        const withdrawAmount = await lazyVWBLContract.availableToWithdraw({from: accounts[1]});
        assert.equal(
            withdrawAmount,
            web3.utils.toWei("2", "ether")
        );
        
        const nftOwnerOfId3 = await lazyVWBLContract.ownerOf(3);
        assert.equal(
            nftOwnerOfId3,
            accounts[2],
            "Redeemer is not received NFT"
        );
    });

    it ("should withdraw mint value by minter", async function () {
        const withdrawAmount = await lazyVWBLContract.availableToWithdraw({from: accounts[1]});
        assert.equal(
            withdrawAmount,
            web3.utils.toWei("2", "ether")
        );

        const beforeEthBalance = await web3.eth.getBalance(accounts[1]);
        console.log('    before withdraw balance of minter', beforeEthBalance);
        await lazyVWBLContract.withdraw({from: accounts[1]});
        const afterEthBalance = await web3.eth.getBalance(accounts[1]);
        console.log('    after withdraw balance of minter', afterEthBalance);
    });

    it ("should not redeem an NFT from a invalid signer voucher", async function() {
        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: invalidSigner,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            TEST_DOCUMENT_ID4, // documentId
            randomString2, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            marketContract.address,
        );
        await expectRevert(
            lazyVWBLContract.redeem(
                accounts[2], // redeemer
                voucher,
                { value: web3.utils.toWei("1", "ether")},
            ),
            "Invalid Signature"
        );
    });

    it ("should not readeem an NFT with already used randomString", async function() {
        const alreadyMinted = await lazyVWBLContract.mintedRandomstring(randomString1);
        assert.equal(
           alreadyMinted,
           true,
           "randomString is not yet used" 
        );

        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: signer,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            TEST_DOCUMENT_ID5, // documentId
            randomString1, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            marketContract.address,
        );
        await expectRevert(
            lazyVWBLContract.redeem(
                accounts[2], // redeemer
                voucher,
                { value: web3.utils.toWei("1", "ether")},
            ),
            "Already minted"
        );
    });

    it ("should not redeem an NFT when msg.value is insufficient", async function() {
        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: signer,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            TEST_DOCUMENT_ID5, // documentId
            randomString2, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            marketContract.address,
            web3.utils.toWei("2", "ether") // sellPrice is 2 ether
        );
        await expectRevert(
            lazyVWBLContract.redeem(
                accounts[2], // redeemer
                voucher,
                { value: web3.utils.toWei("2", "ether")},
            ),
            "Insufficient funds to redeem"
        );
    });
})