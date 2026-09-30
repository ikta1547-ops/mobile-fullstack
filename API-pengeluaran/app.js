// app.js
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import pengeluaranRoutes from './routes/pengeluaran.js';

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint untuk mengambil daftar kategori dari database
app.get('/kategori', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama FROM kategori ORDER BY nama');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Gagal mengambil kategori' });
  }
});

// Daftarkan router pengeluaran dengan prefix '/pengeluaran'
app.use('/pengeluaran', pengeluaranRoutes);

export default app;