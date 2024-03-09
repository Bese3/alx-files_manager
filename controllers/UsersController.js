/* eslint-disable */
import dbClient from "../utils/db.js";
import sha1 from 'sha1';
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
}
