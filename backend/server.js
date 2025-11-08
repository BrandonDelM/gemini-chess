import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  // Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    root: path.join(__dirname, '../frontend'),
  });

  // Use Vite’s middleware
  app.use(vite.middlewares);

  // Example API route
  app.get('/api/message', (req, res) => {
    res.json({ text: 'Hello from Express!' });
  });

  // All other routes handled by Vite’s index.html
  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await vite.transformIndexHtml(url, 
        await fs.promises.readFile(path.join(__dirname, '../frontend/index.html'), 'utf-8')
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => console.log('http://localhost:3000'));
}

startServer();
