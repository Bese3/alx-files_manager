/* eslint-disable */
import thumbnail from 'image-thumbnail';
import path from 'path';
import fs from 'fs';

export default class ThumbSizing {
    static async getImageThumb(filePath) {
        const allowedSize = [500, 250, 100];
        const name = path.basename(filePath);
        allowedSize.forEach(async (elem) => {
            const options = {width: elem};
            const newFilePath= `${path.dirname(filePath)}/${name}_${elem}`;
            thumbnail(filePath, options)
            .then(async (imgBuffer) => {
                await fs.writeFile(newFilePath, imgBuffer, (err) => {
                    if (err) {
                        console.log(`error creating thumbnail file ${err}`)
                    }
                });
            });
        });
    }
}