import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

export default class AppController {

    static getStatus(_req, res){
        let redis = false;
        let db = false;
        if (redisClient.isAlive()) {
            redis = true;
        }
        if (dbClient.isAlive()) {
            db = true
        }
        res.json({redis, db});
    }
    
    static getStats(_req, res) {
        Promise.all([dbClient.nbFiles(), dbClient.nbUsers()])
        .then(([files, users]) => {
            res.json({users, files})
        })
    }
}

