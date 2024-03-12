/* eslint-disable */
import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";
import mongodb from 'mongodb';
import { v4 as uuid4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import Bull from 'bull';
const REDIS_URL = 'redis://127.0.0.1:6379';
const fileQueue = new Bull('fileQueue', REDIS_URL);


function copyImage(sourceFilePath, destinationFilePath) {
    // Create a readable stream from the source file
    const readStream = fs.createReadStream(sourceFilePath);

    // Create a writable stream to the destination file
    const writeStream = fs.createWriteStream(destinationFilePath);

    // Pipe the read stream to the write stream to copy the file
    readStream.pipe(writeStream);

    // Handle events for when the copying process is complete or if an error occurs
    writeStream.on('finish', () => {
        console.log('Image copied successfully');
    });

    writeStream.on('error', (err) => {
        console.error('Error copying image:', err);
    });
}

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
        let parentId = req.body.parentId || '0';
        const isPublic = req.body.isPublic || false;
        let data = req.body.data;
        let doc = {
            userId,
            name,
            type,
            isPublic,
            parentId
        };
        let pid = parentId;
            if (parentId === '0'){
                pid = 0;
            }


        if (req.body.type === 'folder') {
            const result = await dbClient.insertDB(doc, 'files');
            res.status(201).json({'id': result.insertedId,
                                    userId,
                                    name,
                                    type,
                                    isPublic,
                                    'parentId': pid
                                 });
        } else {
        const path = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileName = uuid4();
        const filePath = `${path}/${fileName}`;
        // console.log(data);
        if (type === 'image') {
            const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
            data = Buffer.from(base64Data, 'base64');
        } else {
            data = Buffer.from(data, 'base64').toString('utf-8');
        }
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true }, (err) => {
                if (err) {
                    console.log(`error creating directory ${path}`);
                } else {
                    console.log(`Successfully created ${path} directory`);
                }
            })
        }
        await fs.writeFile(filePath, data, (err) => {

            if(err) {
                return new Error(`cannot create file ${err}`)
            }
            console.log(`temp file created at ${filePath}`);
        });
        doc.localPath = filePath;
        const result = await dbClient.insertDB(doc, 'files');
        if (type === 'image') {
            // adding jobs to the queue
            await fileQueue.add({
                'userId': userId.toString(),
                'fileId': result.insertedId
            })
            .then(() => {
                console.log('Job added successfully');
            })
        }
        res.status(201).json({
            'id': result.insertedId,
            userId,
            name,
            type,
            isPublic,
            'parentId': pid
        });
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
                delete elem.localPath;
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
        if (parentId != '0') {
            parentId = mongodb.ObjectId(parentId);
        }

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
                delete elem.localPath;
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
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'})
            return
        }
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
            let parentId = files.parentId;
            if (parentId === '0') {
                parentId = 0;
            }

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
        if (userId === null) {
            res.status(401).json({'error': 'Unauthorized'})
            return
        }
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
            let parentId = files.parentId;
            if (parentId === '0') {
                parentId = 0;
            }

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

    static async getFile(req, res) {
        if(!req.params.id) {
            res.status(404).json({'error': 'Not found'});
            return
        }
        let fileId = req.params.id;
        let size = req.query.size || 250;
        const allowedSize = [500, 250, 100];
        if (!allowedSize.includes(size)) {
            size = 250;
        }
        let userId = await redisClient.get(`auth_${req.headers['x-token']}`);
        // if (userId === null) {
        //     res.status(404).json({'error': 'Not found'});
        //     return
        // }
        fileId = mongodb.ObjectId(fileId);
        userId = mongodb.ObjectId(userId);
        let authenticated = false;
        await dbClient.findBy({userId}, 'users')
              .then((result) => {
                return result.toArray();
              })
              .then(async (result) => {
                if (result.length > 0) {
                    authenticated = true;
                }

            await dbClient.findBy({'_id': fileId}, 'files')
              .then((result) => {
                return result.toArray();
              })
              .then((result) => {
                if (result.length === 0) {
                    res.status(404).json({'error': 'Not found'});
                    return
                }
                result = result[0]
                if (!(result.isPublic || (authenticated && result.userId.toString() == userId.toString()))) {
                    console.log(0)
                    res.status(404).json({'error': 'Not found'});
                    return
                }
                if (result.type === 'folder') {
                    res.status(400).json({'error': 'A folder doesn\'t have content'});
                    return
                }
                if (!fs.existsSync(result.localPath)) {
                    res.status(404).json({'error': 'Not found'});
                    return
                }
                const ctype = mime.lookup(result.name);
                res.setHeader('Content-Type', ctype);
                if (result.type === 'image') {
                    res.status(200).sendFile(`${result.localPath}_${size}`);
                    return
                }
                res.status(200).sendFile(result.localPath);
              });
              });
        

    }
}
