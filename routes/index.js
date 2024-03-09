import { Router } from "express";
import AppController from '../controllers/AppController';


const router = Router();

router.get('/status', Appcontroller.getStatus);

router.get('/stats', Appcontroller.getStats);