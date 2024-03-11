/* eslint-disable */
import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";
import mongodb from 'mongodb';
import { v4 as uuid4 } from 'uuid';
import fs from 'fs';

export default class FilesController {
    static async postUpload(req, res) {
        if (!req.headers['x-token']){
            res.status(401).json({'error' :'Unauthorized'});
            return
        }
        const token = req.headers['x-token'];
        const key = `auth_${token}`;
        let userId = await redisClient.get(key);
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        userId = mongodb.ObjectId(userId);
        if (!req.body.name){
            res.status(400).json({'error': 'Missing name'});
            return
        }
        const typeList = ['folder', 'file', 'image'];
        if (!req.body.type || !typeList.includes(req.body.type)){
            res.status(400).json({'error': 'Missing type'});
            return
        }
        if (req.body.type != 'folder' && !req.body.data){
            res.status(400).json({'error': 'Missing data'});
            return
        }
        const objId = mongodb.ObjectId(req.body.parentId);
        let inRes = false;
        if (req.body.parentId) {
            await dbClient.findBy({'_id': objId}, 'files')
            .then((result) => {
                return result.toArray();
            })
            .then((result) => {
                if (result.length === 0) {
                    inRes = true;
                    res.status(400).json({'error': 'Parent not found'});
                    return
                }
                if (result[0].type != 'folder') {
                    inRes = true;
                    res.status(400).json({'error': 'Parent is not a folder'});
                }
            });
        }
        if (inRes) return
        
        const name = req.body.name;
        const type = req.body.type;
        const parentId = req.body.parentId || '0';
        const isPublic = req.body.isPublic || false;
        let data = req.body.data;
        let doc = {
            userId,
            name,
            type,
            isPublic,
            parentId
        };

        if (req.body.type === 'folder') {
            const result = await dbClient.insertDB(doc, 'files');
            res.status(201).json({'id': result.insertedId,
                                    userId,
                                    name,
                                    type,
                                    isPublic,
                                    parentId
                                 });
        } else {
        const path = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileName = uuid4();
        const filePath = `${path}/${fileName}`;
        data = Buffer.from(data, 'base64').toString('utf-8');
        await fs.writeFile(filePath, data, (err) => {

            if(err) {
                return new Error(`cannot create file ${err}`)
            }
            // console.log(`temp file created at ${filePath}`);
        });
        doc = {
            userId,
            name,
            type,
            isPublic,
            parentId,
            filePath
        };
        const result = await dbClient.insertDB(doc, 'files');
        res.status(201).json({
            'id': result.insertedId,
            userId,
            name,
            type,
            isPublic,
            parentId
        })
        }
    }

    static async getShow(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        const key =`auth_${req.headers['x-token']}`;
        let userId = await redisClient.get(key);
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        const id = req.params.id;
        const _id = mongodb.ObjectId(id);
        userId = mongodb.ObjectId(userId);
        await dbClient.findBy({_id, userId}, 'files')
        .then((result) => {
            return result.toArray();
        })
        .then((result) => {
            if (result.length === 0) {
                console.log(0)
                res.status(404).json({'error': 'Not found'});
                return
            }
            result.forEach(elem => {
                elem.id = elem._id
                delete elem._id;
                delete elem.filePath;
            });
            result = result.map(({id, ...result}) => ({id, ...result}))
            res.json(result[0]);
        });
    }

    static async getIndex(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        const key =`auth_${req.headers['x-token']}`;
        const userId = await redisClient.get(key);
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
        let parentId = req.query.parentId || '0';

        const page = req.query.page || 0;
        const skip = (page) * (20);

        await dbClient.findByPag({parentId}, 'files', skip)
        .then((result) => {
            return result.toArray();
        })
        .then((result) => {
            if (result.length === 0) {
                res.json([]);
                return
            }
            result.forEach(elem => {
                elem.id = elem._id
                delete elem._id;
                delete elem.filePath;
            });
            result = result.map(({id, ...result}) => ({id, ...result}))
            res.json(result);
            })
    }

    static async putPublish(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'})
            return
        }

        const token = req.headers['x-token'];
        const key = `auth_${token}`;
        let userId = await redisClient.get(key);
        userId = mongodb.ObjectId(userId);
        const _id = mongodb.ObjectId(req.params.id);
        await dbClient.findBy({_id, userId}, 'files')
        .then((result) => {
            return result.toArray();
        })
        .then(async (result) => {
            if (result.length === 0) {
                res.status(404).json({'error': 'Not found'});
                return
            }
            result = result[0];
            let files = await dbClient.updateDB(result, {$set: {'isPublic': true}}, 'files');
            files = files.value;
            const id = files._id;
            const userId = files.userId;
            const name = files.name;
            const type = files.type;
            const isPublic = files.isPublic;
            const parentId = files.parentId;

            res.json({
                id,
                userId,
                name,
                type,
                isPublic,
                parentId
            });
        })
    }

    static async putUnpublish(req, res) {
        if (!req.headers['x-token']) {
            res.status(401).json({'error': 'Unauthorized'})
            return
        }

        const token = req.headers['x-token'];
        const key = `auth_${token}`;
        let userId = await redisClient.get(key);
        userId = mongodb.ObjectId(userId);
        const _id = mongodb.ObjectId(req.params.id);
        await dbClient.findBy({_id, userId}, 'files')
        .then((result) => {
            return result.toArray();
        })
        .then(async (result) => {
            if (result.length === 0) {
                res.status(404).json({'error': 'Not found'});
                return
            }
            result = result[0];
            let files = await dbClient.updateDB(result, {$set: {'isPublic': false}}, 'files');
            files = (files.value);
            const id = files._id;
            const userId = files.userId;
            const name = files.name;
            const type = files.type;
            const isPublic = files.isPublic;
            const parentId = files.parentId;

            res.json({
                id,
                userId,
                name,
                type,
                isPublic,
                parentId
            });
        })
    }
}
