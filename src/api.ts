import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { exec } from 'child_process'; // Non più usato direttamente, ma teniamo per sicurezza
import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static'; // AGGIUNTA
import ffmpeg from 'fluent-ffmpeg'; // AGGIUNTA

ffmpeg.setFfmpegPath(ffmpegStatic || ''); // AGGIUNTA: Configura fluent-ffmpeg con il percorso statico

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

  const outputPath = path.join(__dirname, `merged-${Date.now()}.mp3`);
  
  // MODIFICATO PER USARE fluent-ffmpeg
  ffmpeg()
    .input(files[0].path)
    .input(files[1].path)
    .input(files[2].path)
    .complexFilter('[0:0][1:0][2:0]concat=n=3:v=0:a=1[out]')
    .outputOptions('-map [out]')
    .save(outputPath)
    .on('end', () => {
      res.download(outputPath, () => {
        files.forEach(f => fs.unlinkSync(f.path));
        fs.unlinkSync(outputPath);
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);
      files.forEach(f => fs.unlinkSync(f.path));
      res.status(500).json({ error: err.message });
    });
});


const api = express.Router();

api.get('/hello', (req, res) => {
  res.status(200).send({ message: 'hello world' });
});

// Version the api
app.use('/api/v1', api);
