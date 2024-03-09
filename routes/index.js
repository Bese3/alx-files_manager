// eslint-disable-next-line import/extensions
import AppController from '../controllers/AppController.js';

function injectRoutes(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
}

export default injectRoutes;
