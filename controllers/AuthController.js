/* eslint-disable */
import sha1 from 'sha1';
import { v4 as uuid4 } from 'uuid';
import mongodb from 'mongodb';
import redisClient from "../utils/redis.js";
import dbClient from "../utils/db.js";

export default class AuthController {
    static async getConnect(req, res) {
        //extract base64 auth
        if (!req.headers['authorization']) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        const auth = req.headers['authorization'];

        const encoded = auth.split(" ")[1];

        // decoding base64
        let data = Buffer.from(encoded, 'base64').toString('utf-8');
        if (!data.includes(':')) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        // extracting info from base64
        data = data.split(':');
        const email = data[0];
        let password = data[1];

        password = sha1(password);
        let user;
        await dbClient.findBy({email, password}, 'users')
        .then((result) => {
            return result.toArray();
        })
        .then(async (result) => {
            if (result.length === 0){
                res.status(401).json({'error': 'Unauthorized'});
            } else {
            user = result[0];
            const token = uuid4();
            const key = `auth_${token}`;
            await redisClient.set(key, user._id.toString(), 86400);
            res.json({token});
           }
        });
    }

    static async getDisconnect(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'});
            return
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
                await redisClient.del(key);
                res.status(204).json();
            }
        })
    }
}
