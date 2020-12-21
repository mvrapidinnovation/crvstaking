const { assert } = require('chai');

const ERC20 = artifacts.require('Token');
const CrvToken = artifacts.require('PoolToken');
const CRVToken = artifacts.require('CRVToken');
const CrvPool = artifacts.require('StableSwap3Pool');
const VotingEscrow = artifacts.require('VotingEscrow');
const Controller = artifacts.require('Pool3GuageController');
const Minter = artifacts.require('Minter');
const Gauge = artifacts.require('Pool3Gauge');

function toDai(n) {
    return web3.utils.toWei(n, 'ether');
}

function toUsd(n) {
    let result = parseFloat(n) * 1e6;
    return result.toString();
}

contract('Curve.fi', ([owner, investor]) => {

    let token1, token2, token3;
    let crvToken, crvPool, CRVtoken;
    let veCRV, controller, minter, gauge;

    before(async() => {

        token1 = await ERC20.new("Token1", "TKN1", 18);
        token2 = await ERC20.new("Token2", "TKN2", 6);
        token3 = await ERC20.new("Token3", "TKN3", 6);

        crvToken = await CrvToken.new("Curve Token", "3CRV", 18, 0);
        CRVtoken = await CRVToken.new("Curve DAO Token", "CRV", 18);
        
        veCRV = await VotingEscrow.new(CRVtoken.address, "Vote-escrowed CRV", "veCRV", "veCRV_1.0.0");

        crvPool = await CrvPool.new(
            owner,
            [token1.address, token2.address, token3.address],
            crvToken.address,
            200, 
            4000000, 
            5000000000, 
        );

        controller = await Controller.new(CRVtoken.address, veCRV.address);

        minter = await Minter.new(CRVtoken.address, controller.address);

        gauge = await Gauge.new(crvToken.address, minter.address);

    });

    describe('Setting up pool and tokens', async() => {

        describe('ERC20 Tokens', async() => {
            it('Token1', async() => {
                let name = await token1.name();
                assert.equal(name, "Token1");
            });

            it('Token2', async() => {
                let name = await token2.name();
                assert.equal(name, "Token2");
            });

            it('Token3', async() => {
                let name = await token3.name();
                assert.equal(name, "Token3");
            });

            it('3CRV', async() => {
                let name = await crvToken.name();
                assert.equal(name, "Curve Token");
            });

            it('has set minter', async() => {
                await crvToken.set_minter(crvPool.address); 
    
                result = await crvToken.minter();
                assert.equal(result.toString(), crvPool.address);
            });

            it('CRV', async() => {
                let name = await CRVtoken.name();
                assert.equal(name, "Curve DAO Token");
            });

            it('veCRV', async() => {
                let name = await veCRV.name();
                assert.equal(name, "Vote-escrowed CRV");
            });

        });

        describe('CrvPool deployment', async() => {
            it('has initial liquidity', async() => {
                await token1.approve(crvPool.address, toDai('50000'));
                await token2.approve(crvPool.address, toUsd('20000'));
                await token3.approve(crvPool.address, toUsd('20000'));
    
                const amounts = [toDai("50000"), toUsd("20000"), toUsd("20000")];
                await crvPool.add_liquidity(amounts, toDai("20000"), { from: owner });
    
                mintAmount = await crvPool.calc_token_amount(amounts, 1);
                supply = await crvToken.totalSupply();
                console.log(supply.toString());
                assert.equal(mintAmount.toString(), supply.toString());
            });
        });

        describe('Guage Controller deployment', async() => {
            it('has CRV address', async() => {
                result = await controller.token();
                assert.equal(result, CRVtoken.address);
            });
        });

        describe('Minter Deployment', async() => {
            it('has CRV address', async() => {
                result = await minter.token();
                assert.equal(result, CRVtoken.address);
            });

            it('has controller address', async() => {
                result = await minter.controller();
                assert.equal(result, controller.address);
            });
        });

        describe('Guage Deployment', async() => {
            it('has curvePool address', async() => {
                result = await gauge.lp_token();
                assert.equal(result, crvToken.address);
            });

            it('has controller address', async() => {
                result = await gauge.minter();
                assert.equal(result, minter.address);
            });
        });

    });

    describe('initial setup', async() => {
        it('1000 tokens each to investor', async() => {
            await token1.transfer(investor, toDai('1000'));
            await token2.transfer(investor, toUsd('1000'));
            await token3.transfer(investor, toUsd('1000'));
        });

        it('investor supply to 3Pool', async() => {
            await token1.approve(crvPool.address, toDai('500'), { from: investor });
            await token2.approve(crvPool.address, toUsd('500'), { from: investor });
            await token3.approve(crvPool.address, toUsd('500'), { from: investor });

            amts = [toDai("500"), toUsd("500"), toUsd("500")];
            // mintAmount = await crvPool.calc_token_amount(amts, 1);
            // mintAmount = (0.99 * (mintAmount / 1e18));
            await crvPool.add_liquidity(amts, toDai('1500'), { from: investor });

            result = await crvToken.balanceOf(investor);
            console.log("Investor 3CRV: ", result.toString());
        });
    });

    describe('Staking/Unstaking', async() => {

        describe('Staking 3CRV', async() => {
            it('approving guage', async() => {
                await crvToken.approve(gauge.address, toDai('100'), { from: investor });
            });

            it('depositing in guage', async() => {
                await gauge.deposit(toDai('100'), { from: investor });

                result = await CRVtoken.balanceOf(investor);
                console.log("Investor CRV: ", result.toString());
            });
            
        });

    });



})