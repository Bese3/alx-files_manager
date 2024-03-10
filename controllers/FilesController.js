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
        const userId = await redisClient.get(key);
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'});
            return
        }
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
        const parentId = req.body.parentId || 0;
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
            console.log('file');
            if(err) {
                return new Error(`cannot create file ${err}`)
            }
            console.log(`temp file created at ${filePath}`);
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
}