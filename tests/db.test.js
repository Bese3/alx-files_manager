/* eslint-disable */
import chai from "chai";
import MongoClient from "mongodb/lib/mongo_client";
import dbClient from "../utils/db";


describe('dbClient tests', () => {
    let testClientDb = null;

    beforeEach(async () => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager'
        };
        const testPromise = () => {
            return new Promise((resolve, reject) => {
                MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, (err, client) => {
                    if (err) {
                        reject();
                    }
                    else {
                        resolve(client.db(dbInfo.database))
                    }
                });
            }); 
        };
        testClientDb = await testPromise();
        await testClientDb.collection('users').deleteMany({})

        const waitConnection = () => {
            return new Promise((resolve, reject) => {
                let i = 0;
                const repeatFct = async () => {
                    await setTimeout(() => {
                        i += 1;
                        if (i >= 5) {
                            reject()
                        }
                        else if(!dbClient.isAlive()) {
                            repeatFct()
                        }
                        else {
                            resolve()
                        }
                    }, 1000);
                }
                repeatFct();
            })
        };
        await waitConnection(); 
    });

    afterEach(async () => {
        await testClientDb.collection('users').deleteMany({})

    });

    it.skip('isAlive when mongodb not started', (done) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                chai.assert.isFalse(dbClient.isAlive());
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
    }).timeout(20000);

    it('isAlive when mongodb started', (done) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 5) {
                    chai.assert.isTrue(false);
                    done()
                }
                else if(!dbClient.isAlive()) {
                    repeatFct()
                }
                else {
                    chai.assert.isTrue(true);
                    done()
                }
            }, 1000);
        }
        repeatFct();
    }).timeout(20000);
        

    it('nbUsers for empty collection', async () => {
        chai.assert.equal(await dbClient.nbUsers(), 0);
    })

    it('nbUsers for a collection with one document', async () => {
        await testClientDb.collection('users').insertOne({ email: "me@me.com" })
        chai.assert.equal(await dbClient.nbUsers(), 1);
    })

    it('nbUsers for a collection with 10 documents', async () => {
        chai.assert.equal(await dbClient.nbUsers(), 0);
        const items = [];
        for(let i = 0 ; i < 10 ; i += 1) {
            items.push({ email: `me-${i}@me.com` });
        }
        await testClientDb.collection('users').insertMany(items);
        chai.assert.equal(await dbClient.nbUsers(), 10);  
    })
})