import express from 'express';
// eslint-disable-next-line import/extensions
import injectRoutes from './routes/index.js';

const app = express();
app.use(express.json());

function StartServer() {
  const Port = process.env.PORT || 5000;
  injectRoutes(app);
  app.listen(Port, () => {
    console.log(`Server Active in port ${Port}`);
  });
}

StartServer();
export default app;
