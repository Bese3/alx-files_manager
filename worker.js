/* eslint-disable */
import Bull from 'bull';
import dbClient from './utils/db.js';
import ThumbSizing from './utils/thumbSizing.js';
import mongodb from 'mongodb';


const REDIS_URL = 'redis://127.0.0.1:6379';
const fileQueue = new Bull('fileQueue', REDIS_URL);
console.log('Worker Started listening for jobs')

fileQueue.process(async (job) => {
    console.log(`Job processing started with Job ID ${job.id}`);
    if (!job.data.fileId) {
        return new Error('Missing fileId');
    }
    if (!job.data.userId) {
        return new Error('Missing userId');
    }
    let fileId = job.data.fileId;
    let userId = job.data.userId;
    fileId = mongodb.ObjectId(fileId);
    userId = mongodb.ObjectId(userId);

    await dbClient.findBy({'_id': fileId, userId}, 'files')
          .then((result) => {
            return result.toArray();
          })
          .then(async (result) => {
            if (result.length === 0) {
                return new Error('File not found')
            }
            result = result[0];
            await ThumbSizing.getImageThumb(result.localPath);
          })
    console.log(`Job process finished for job ${job.id}`)
})