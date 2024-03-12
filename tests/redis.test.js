import chai from 'chai';
import sinon from 'sinon';
import redis from 'redis';
import { promisify } from 'util';
import redisClient from '../utils/redis.js';

sinon.stub(console, 'log');


describe('redisClient test', () => {   
    let testRedisClient;
    let redisDelAsync;
    let redisSetAsync;
    let redisGetAsync;

    beforeEach((done) => {
        testRedisClient = redis.createClient();
        redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
        redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
        redisGetAsync = promisify(testRedisClient.get).bind(testRedisClient);
        testRedisClient.on('connect', async () => {
            await redisDelAsync('nonExistingKey');
            await redisSetAsync('newKey', 80);
            done()
        });
    });
    
    afterEach(async () => {
        await redisDelAsync('newKey');
    });
    
    it.skip('isAlive when redis not started', (done) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                let cResult
                try {
                    cResult = redisClient.isAlive()
                } catch (error) {
                    cResult = false
                }
                chai.assert.isFalse(cResult);
                i += 1;
                if (i >= 5) {
                    done()
                }
                else {
                    repeatFct()
                }
            }, 1000);
        }
        repeatFct();
    }).timeout(10000);

    it('isAlive when redis started', (done) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 5) {
                    chai.assert.isTrue(false);
                    done()
                }
                else if(!redisClient.isAlive()) {
                    repeatFct()
                }
                else {
                    chai.assert.isTrue(true);
                    done()
                }
            }, 1000);
        }
        repeatFct();
    }).timeout(10000);

    it('get of not existing key', async () => {
        chai.assert.notExists(await redisClient.get('nonExistingKey'));
    });

    it('get of existing key', async () => {
        const kv = await redisClient.get('newKey');
        chai.assert.exists(kv);
        chai.assert.equal(kv, 80)
    });

    it('redisClient\'s set expiration test', (done) => {
        setTimeout(async() => {
            await redisClient.set('ttl', 50, 3);
            const value = await redisGetAsync('ttl');
            chai.assert.exists(value);
            chai.assert.equal(value, 50);
            setTimeout(async () => {
            const value = await redisGetAsync('ttl');
            chai.assert.notExists(value);
            }, 5000);
        }, 1000)
        done();
    }).timeout(20000)

    it('redisClient\'s del method', (done) => {
        setTimeout(async () => {
        await redisClient.set('ttl', 50, 3);
        let value = await redisGetAsync('ttl');
        chai.assert.exists(value);
        chai.assert.equal(value, 50);
        await redisClient.del('ttl');
        value = await redisGetAsync('ttl');
        chai.assert.notExists(value);
        done();
        }, 1000);
    })
});