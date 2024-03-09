import express from 'express';
// eslint-disable-next-line import/extensions
import AppController from '../controllers/AppController.js';

const PORT = Number(process.env.PORT) || 5000;
const app = express();

app.use(express.json());

app.get('/status', AppController.getStatus);

app.get('/stats', AppController.getStats);

app.listen(PORT);
