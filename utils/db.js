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
        const uri = `mongodb://${this.host}:${this.port}`;
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.isConnected = false;
        this.client.connect((err) => {
            if (err) {
                this.isConnected = false;
                return
            }
            this.isConnected = true;
        });
        this.db = this.client.db(this.database);
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
        const userCollection = this.db.collection('users');
        const count = await userCollection.countDocuments();
        return count;
    }

    /**
     * retrieves the total number of documents in the 'files' collection
     * asynchronously.
     */
    async nbFiles() {
        const fileCollection = this.db.collection('files');
        const count = await fileCollection.countDocuments();
        return count;
    }
}

// eslint-enable indent
const dbClient = new DBClient();

export default dbClient;