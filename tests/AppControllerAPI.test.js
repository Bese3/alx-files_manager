import chaiHttp from "chai-http";
import chai from "chai";
import { MongoClient } from "mongodb";


const expect = chai.expect
chai.use(chaiHttp);


describe.skip('AppController API test /getStatus, /getStats', () => {
    let testDBClient;
    beforeEach(async () => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager'
        };
        const testPromise = async () => {
            return new Promise((res, rej) => {
                 MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, (err, client) => {
                    if (err) {
                        rej(err)
                    } else {
                        res(client.db(dbInfo.database))
                    }
                 });

            });
        }
        testDBClient = await testPromise();
        await testDBClient.collection('users').deleteMany({})
    });

    afterEach(() => {})


    it('GET /status exists', (done) => {
        chai.request('http://localhost:5000')
            .get('/status')
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
            });
            done();
    }).timeout(30000);

    it('GET /stats exists', (done) => {
        chai.request('http://localhost:5000')
            .get('/stats')
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body.redis).to.be.true;
                expect(res.body.db).to.be.true;
            })
            done();
    });

    it('GET status return 0 users', (done) => {
        chai.request('http://localhost:5000')
            .get('/status')
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body.nbUsers).to.equal(0);
            })
            done();
    })
})