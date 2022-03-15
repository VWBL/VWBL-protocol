const { assert } = require("chai");
const hardhat = require("hardhat");
const { LazyMinter } = require("../lib/index");
const { ethers } = hardhat;
const transferVWBLNFT = artifacts.require("TransferVWBLNFT");
const lazyVWBL = artifacts.require("VWBLLazyMinting");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract ("VWBLLazyMinting test", async accounts => {
    let signer;
    let signerAddress;
    let invalidSigner;
    let transferVWBLNFTContract;
    let lazyVWBLContract;
    let chainId;
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
        lazyVWBLContract = await lazyVWBL.new(
            signerAddress, 
            "http://xxx.zzz.com",
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

        transferVWBLNFTContract = await transferVWBLNFT.new(
            lazyVWBLContract.address
        );
    })

    it ("should mint nft", async () => {
        await lazyVWBLContract.mint("http://xxx.yyy.com", 500, { from: accounts[1] });
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
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
    });
    
    it ("should mint multiple nfts", async () => {
        await lazyVWBLContract.mint("http://xxx.yyy.zzz.com", 500, { from: accounts[1] });
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
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
    });

    it ("should transfer VWBLNFT", async function () {
        await lazyVWBLContract.setApprovalForAll(transferVWBLNFTContract.address, true, {from: accounts[1]});
        await transferVWBLNFTContract.transferNFT(accounts[2], 1, { from: accounts[1] });
        const nftOwnerOfId1 = await lazyVWBLContract.ownerOf(1);
        assert.equal(
            nftOwnerOfId1,
            accounts[2],
            "accounts[2] is not received NFT"
        );
    })

    it ("should redeem an NFT from a valid signer voucher", async function() {
        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: signer,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            randomString1, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            web3.utils.toWei("0.5", "ether")
        );
        await lazyVWBLContract.redeem(
            accounts[2], // redeemer
            voucher,
            { value: web3.utils.toWei("1", "ether")},
        );
        const tokens = await lazyVWBLContract.getTokenByMinter(accounts[1]);
        assert.equal(
            tokens[2].minterAddress, 
            accounts[1],
            "Minter is not correct"
        );
        assert.equal(
            tokens[2].getKeyURl,
            'http://aaa.xxx.yyy.zzz.com',
            "keyURL is not correct"
        );

        const withdrawAmount = await lazyVWBLContract.availableToWithdraw({from: accounts[1]});
        assert.equal(
            withdrawAmount,
            web3.utils.toWei("1", "ether")
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
            web3.utils.toWei("1", "ether")
        );

        const beforeEthBalance = await web3.eth.getBalance(accounts[1]);
        console.log('before withdraw balance of minter', beforeEthBalance);
        await lazyVWBLContract.withdraw({from: accounts[1]});
        const afterEthBalance = await web3.eth.getBalance(accounts[1]);
        console.log('after withdraw balance of minter', afterEthBalance);
    });

    it ("should not redeem an NFT from a invalid signer voucher", async function() {
        const lazyMinter = new LazyMinter({ 
            contract: lazyVWBLContract, 
            signer: invalidSigner,
            chainId: chainId,
        });
        const voucher = await lazyMinter.createVoucher(
            accounts[1], // minter
            randomString2, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500
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
            randomString1, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500
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
            randomString2, // randomString
            'http://aaa.xxx.yyy.zzz.com',
            500,
            web3.utils.toWei("2", "ether") // minPrice is 2 ether
        );
        await expectRevert(
            lazyVWBLContract.redeem(
                accounts[2], // redeemer
                voucher,
                { value: web3.utils.toWei("1", "ether")},
            ),
            "Insufficient funds to redeem"
        );
    });
})