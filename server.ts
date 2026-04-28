import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Image Proxy Endpoint
  app.get('/api/proxy', async (req, res) => {
    let imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('URL is required');
    }

    // Convert Google Drive view links to direct download links
    if (imageUrl.includes('drive.google.com')) {
      const match = imageUrl.match(/\/d\/([^\/]+)/);
      if (match && match[1]) {
        imageUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    try {
      console.log('Proxying image requested:', imageUrl);
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*'
        },
        timeout: 20000
      });

      const contentType = String(response.headers['content-type'] || 'image/jpeg');
      
      // If we got HTML back, it means we didn't get the image (likely a login page or error)
      if (contentType.includes('text/html')) {
        console.error('Proxy received HTML instead of image for:', imageUrl);
        return res.status(400).send('Failed to fetch raw image data. Ensure the file is public.');
      }

      console.log('Successfully fetched image, type:', contentType);
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      res.setHeader('Content-Type', 'text/plain');
      res.send(`data:${contentType};base64,${base64}`);
    } catch (error: any) {
      console.error('Error proxying image:', imageUrl, error.message);
      res.status(500).send('Error proxying image: ' + error.message);
    }
  });

  // API Routes could go here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
