import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs"
import { expect } from "chai"
import { ethers } from "hardhat"

const feeWei = ethers.utils.parseEther("0.001")
const baseURI = ""
const vwblNetworkUrl = "http://xxx.yyy.com"

describe("Getter function", function () {
    async function deployTokenFixture() {
        // account
        const [owner, minter1, minter2, minter3] = await ethers.getSigners()
        // VWBL Gateway
        const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
        const vwblGateway = await VWBLGateway.deploy(feeWei)
        // Gateway Proxy
        const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
        const gatewayProxy = await GatewayProxy.deploy(vwblGateway.address)
        // VWBL NFT
        const AccessControlCheckerByNFT = await ethers.getContractFactory("AccessControlCheckerByNFT")
        const nftChecker = await AccessControlCheckerByNFT.deploy(gatewayProxy.address)
        const VWBLNFT = await ethers.getContractFactory("VWBL")
        const vwblNFT_1 = await VWBLNFT.deploy(baseURI, gatewayProxy.address, nftChecker.address, "Hello, VWBL")
        const vwblNFT_2 = await VWBLNFT.deploy(baseURI, gatewayProxy.address, nftChecker.address, "Hello, VWBL {{nonce}}")
        // VWBL ERC1155
        const AccessControlCheckerByERC1155 = await ethers.getContractFactory("AccessControlCheckerByERC1155")
        const erc1155Checker = await AccessControlCheckerByERC1155.deploy(gatewayProxy.address)
        const VWBLERC1155 = await ethers.getContractFactory("VWBLERC1155")
        const vwblERC1155_1 = await VWBLERC1155.deploy(baseURI, gatewayProxy.address, erc1155Checker.address, "Hello, VWBL")
        const vwblERC1155_2 = await VWBLERC1155.deploy(baseURI, gatewayProxy.address, erc1155Checker.address, "Hello, VWBL {{nonce}}")
        return {
            vwblGateway,
            vwblNFT_1,
            vwblNFT_2,
            nftChecker,
            vwblERC1155_1,
            vwblERC1155_2,
            erc1155Checker,
            owner,
            minter1,
            minter2,
            minter3,
        }
    }

    describe("Mint", function () {
        it("Should VWBL NFT successfully Minted and Transferd", async function () {
            // One Contract
            const { vwblNFT_1, vwblNFT_2, nftChecker, minter1, minter2, minter3 } = await loadFixture(
                deployTokenFixture
            )
            const documentId_1 = ethers.utils.randomBytes(32)
            await vwblNFT_1.connect(minter1).mint(vwblNetworkUrl, 0, documentId_1, { value: feeWei })
            expect((await nftChecker.getOwnerAddress(documentId_1)) === minter1.address).to.equal(true)
            expect((await nftChecker.getOwnerAddress(documentId_1)) === minter3.address).to.equal(false)

            const tokens_1 = await vwblNFT_1.getTokenByMinter(minter1.address)
            await vwblNFT_1.connect(minter1).transferFrom(minter1.address, minter3.address, tokens_1[0])
            expect((await nftChecker.getOwnerAddress(documentId_1)) === minter1.address).to.equal(false)
            expect((await nftChecker.getOwnerAddress(documentId_1)) === minter3.address).to.equal(true)

            // Another Contract
            const documentId_2 = ethers.utils.randomBytes(32)
            await vwblNFT_2.connect(minter2).mint(vwblNetworkUrl, 0, documentId_2, { value: feeWei })
            expect((await nftChecker.getOwnerAddress(documentId_2)) === minter2.address).to.equal(true)
            expect((await nftChecker.getOwnerAddress(documentId_2)) === minter3.address).to.equal(false)

            const tokens_2 = await vwblNFT_2.getTokenByMinter(minter2.address)
            await vwblNFT_2.connect(minter2).transferFrom(minter2.address, minter3.address, tokens_2[0])
            expect((await nftChecker.getOwnerAddress(documentId_2)) === minter2.address).to.equal(false)
            expect((await nftChecker.getOwnerAddress(documentId_2)) === minter3.address).to.equal(true)
        })

        it("Should VWBL ERC1155 successfully Minted and Transferd", async function () {
            const { vwblERC1155_1, vwblERC1155_2, erc1155Checker, minter1, minter2, minter3 } = await loadFixture(
                deployTokenFixture
            )
            // One Contract
            const documentId_1 = ethers.utils.randomBytes(32)
            const amount_1 = 100
            await vwblERC1155_1.connect(minter1).mint(vwblNetworkUrl, amount_1, 0, documentId_1, { value: feeWei })
            expect(await erc1155Checker.checkAccessControl(minter1.address, documentId_1)).to.equal(true)
            expect(await erc1155Checker.checkAccessControl(minter3.address, documentId_1)).to.equal(false)

            await vwblERC1155_1
                .connect(minter1)
                .safeTransferAndPayFee(minter1.address, minter3.address, 1, 10, ethers.utils.randomBytes(32), {
                    value: feeWei,
                })
            expect(await erc1155Checker.checkAccessControl(minter1.address, documentId_1)).to.equal(true)
            expect(await erc1155Checker.checkAccessControl(minter3.address, documentId_1)).to.equal(true)

            // Another Contract
            const documentId_2 = ethers.utils.randomBytes(32)
            const amount_2 = 55
            await vwblERC1155_2.connect(minter2).mint(vwblNetworkUrl, amount_2, 0, documentId_2, { value: feeWei })
            expect(await erc1155Checker.checkAccessControl(minter2.address, documentId_2)).to.equal(true)
            expect(await erc1155Checker.checkAccessControl(minter3.address, documentId_2)).to.equal(false)

            await vwblERC1155_2
                .connect(minter2)
                .safeTransferAndPayFee(minter2.address, minter3.address, 1, 55, ethers.utils.randomBytes(32), {
                    value: feeWei,
                })
            expect(await erc1155Checker.checkAccessControl(minter2.address, documentId_1)).to.equal(false)
            expect(await erc1155Checker.checkAccessControl(minter3.address, documentId_1)).to.equal(true)
        })
    })

    describe("Getter function", function () {
        it("should getNFTDatas() and getERC1155Datas() successfully work", async function () {
            const {
                vwblNFT_1,
                vwblNFT_2,
                vwblERC1155_1,
                vwblERC1155_2,
                nftChecker,
                erc1155Checker,
                minter1,
                minter2,
                minter3,
            } = await loadFixture(deployTokenFixture)

            // Mint
            await vwblNFT_1.connect(minter1).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblNFT_1.connect(minter2).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblNFT_1.connect(minter3).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })

            await vwblNFT_2.connect(minter1).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblNFT_2.connect(minter2).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblNFT_2.connect(minter3).mint(vwblNetworkUrl, 0, ethers.utils.randomBytes(32), { value: feeWei })

            await vwblERC1155_1
                .connect(minter1)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblERC1155_1
                .connect(minter2)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblERC1155_1
                .connect(minter3)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })

            await vwblERC1155_2
                .connect(minter1)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblERC1155_2
                .connect(minter2)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })
            await vwblERC1155_2
                .connect(minter3)
                .mint(vwblNetworkUrl, 100, 0, ethers.utils.randomBytes(32), { value: feeWei })

            // getNFTDatas
            const nftDatas = await nftChecker.getNFTDatas()
            const nftDocumentIds = nftDatas[0]
            // console.log("nftDocumentIds", nftDocumentIds)
            expect(nftDocumentIds.length).to.equal(6)

            // getERC1155Datas
            const erc1155Datas = await erc1155Checker.getERC1155Datas()
            const erc1155DocumentIds = erc1155Datas[0]
            // console.log("erc1155DocumentIds", erc1155DocumentIds)
            expect(erc1155DocumentIds.length).to.equal(6)
        })

    describe("Sign Message", function () {
        it("Should message to be signed of contracts successfully get", async function () {
            const {
                vwblNFT_1,
                vwblNFT_2,
                vwblERC1155_1,
                vwblERC1155_2
            } = await loadFixture(deployTokenFixture)
            expect(await vwblNFT_1.getSignMessage()).to.equal("Hello, VWBL")
            expect(await vwblNFT_2.getSignMessage()).to.equal("Hello, VWBL {{nonce}}")
            expect(await vwblERC1155_1.getSignMessage()).to.equal("Hello, VWBL")
            expect(await vwblERC1155_2.getSignMessage()).to.equal("Hello, VWBL {{nonce}}")
        })

        it("Should message to be signed of contracts successfully change", async function () {
            const {
                owner,
                vwblNFT_1,
                vwblERC1155_1,
            } = await loadFixture(deployTokenFixture)
            const sampleSignMessge1 = "vwblNFT_1 {{nonce}}"
            const sampleSignMessge2 = "vwblERC1155_1 {{nonce}}"

            // change sign message
            await vwblNFT_1.connect(owner).setSignMessage(sampleSignMessge1)
            await vwblERC1155_1.connect(owner).setSignMessage(sampleSignMessge2)

            // check sign message
            expect(await vwblNFT_1.getSignMessage()).to.equal(sampleSignMessge1)
            expect(await vwblERC1155_1.getSignMessage()).to.equal(sampleSignMessge2)
        })
    })

    describe("Allow Origins", function () {
        it("Should allow origin successfully set and getted. Only owner is able to call set method", async function () {
            const {
                owner,
                minter1,
                vwblNFT_1,
                vwblERC1155_1
            } = await loadFixture(deployTokenFixture)

            //Act
            await vwblNFT_1.connect(owner).setAllowOrigins('https://example1.com');
            await vwblERC1155_1.connect(owner).setAllowOrigins('https://example1.com');
            //Assert
            expect(await vwblNFT_1.connect(minter1).getAllowOrigins()).to.equal('https://example1.com');
            expect(await vwblERC1155_1.connect(minter1).getAllowOrigins()).to.equal('https://example1.com');
            //Act
            await vwblNFT_1.connect(owner).setAllowOrigins('https://example2.com, https://example3.com');
            await vwblERC1155_1.connect(owner).setAllowOrigins('https://example2.com, https://example3.com');
            //Assert
            expect(await vwblNFT_1.connect(minter1).getAllowOrigins()).to.equal('https://example2.com, https://example3.com');
            expect(await vwblERC1155_1.connect(minter1).getAllowOrigins()).to.equal('https://example2.com, https://example3.com');
            expect(vwblNFT_1.connect(minter1).setAllowOrigins('https://example3.com')).to.be.revertedWith('Ownable: caller is not the owner');
            expect(vwblERC1155_1.connect(minter1).setAllowOrigins('https://example3.com')).to.be.revertedWith('Ownable: caller is not the owner');
        })
    })
    })
})
