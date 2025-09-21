import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path'; // Keep this import for fs.unlinkSync to work properly

export const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.raw({ type: 'application/vnd.custom-type' }));
app.use(express.text({ type: 'text/html' }));

// Healthcheck endpoint
app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Audio merger endpoint
app.post('/merge-audio', upload.array('audio', 3), (req, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length !== 3) {
    return res.status(400).json({ error: 'Need exactly 3 audio files' });
  }

  const outputPath = path.join(__dirname, `merged-${Date.now()}.mp3`); // Use path.join for output
  
  exec(`ffmpeg -i ${files[0].path} -i ${files[1].path} -i ${files[2].path} -filter_complex "[0:0][1:0][2:0]concat=n=3:v=0:a=1[out]" -map "[out]" ${outputPath}`, (error) => {
    if (error) {
      console.error('FFmpeg error:', error); // Log the error
      // Clean up uploaded files in case of FFmpeg error
      files.forEach(f => fs.unlinkSync(f.path));
      return res.status(500).json({ error: error.message });
    }
    
    res.download(outputPath, (err) => {
      if (err) {
        console.error('Download error:', err); // Log download error
      }
      // Cleanup all files
      files.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(outputPath);
    });
  });
});


const api = express.Router();

api.get('/hello', (req, res) => {
  res.status(200).send({ message: 'hello world' });
});

// Version the api
app.use('/api/v1', api);
