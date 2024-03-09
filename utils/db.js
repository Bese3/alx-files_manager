import mongodb from 'mongodb';

/**
 * DB class for MongoDB
 */

// eslint-disable-next-line prefer-destructuring
const MongoClient = mongodb.MongoClient;

// eslint-disable indent
class DBClient {
    /**
     * initializes a MongoDB client with connection details from env
     * variables and establishes a connection to the specified database.
     */
    constructor(){
        this.host = process.env.DB_HOST || 'localhost';
        this.port = Number(process.env.DB_PORT) || 27017;
        this.database = process.env.DB_DATABASE || 'file_manager';
        const uri = `mongodb://${this.host}:${this.port}/${this.database}`;
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.isConnected = false;
        this.client.connect();
        this.client.on('connected', () => {
            this.isConnected = true;
        })
        .on('disconnected', () => {
            this.isConnected = false;
        })
    }

    /**
     * returns the value of the isConnected property.
     */
    isAlive() {
        return this.isConnected;
    }

    /**
     * retrieves the total number of documents in the 'users' collection
     * asynchronously.
     */
    async nbUsers() {
        const count = await this.client.db().collection('users').countDocuments();
        return count;
    }

    /**
     * retrieves the total number of documents in the 'files' collection
     * asynchronously.
     */
    async nbFiles() {
        return await this.client.db().collection('files').countDocuments();
    }
}

// eslint-enable indent
const dbClient = new DBClient();

export default dbClient;