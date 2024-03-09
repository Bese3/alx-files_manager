/* eslint-disable */
import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";
import sha1 from 'sha1';
import mongodb from "mongodb";
export default class UsersController {
    static async postNew(req, res) {
        if (!req.body.email) {
            res.status(400).json({'error': 'Missing email'});
            return
        }
        if (!req.body.password){
            res.status(400).json({'error': 'Missing password'});
            return
        }
        const email = req.body.email;
        let password = req.body.password;
        let exists = false;
        await dbClient.findBy({email}, 'users')
        .then((res) => {
            return res.toArray();
        })
        .then((res) => {
            if (res.length >= 1) {
                exists = true;
            }
        });
        if (exists) {
            res.status(400).json({'error': 'Already exist'});
        } else {
        password = sha1(password);
        const result = await dbClient.insertDB({email, password}, 'users')        
        res.status(201).json({'id': result.insertedId, email});
        }
    }

    static async me(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'});
        }
        const token = req.headers['x-token'];
        const key = `auth_${token}`;
        const _id = await redisClient.get(key);
        const objId = mongodb.ObjectId(_id);
        await dbClient.findBy({'_id': objId}, 'users')
        .then((result) => {
            return result.toArray();
        })
        .then(async (result) => {
            if (result.length === 0) {
                res.status(401).json({'error': 'Unauthorized'});
            } else {
                res.status(200).json({'id': result[0]._id.toString(), 'email': result[0].email});
            }
        })
    }
}
