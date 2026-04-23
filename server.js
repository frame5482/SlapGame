const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Party = require('./models/Party');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/slapgali';
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        seedParties();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Initial seed
async function seedParties() {
    const partyNames = [
        'ฝ่ายเครียดแค้นจักรพรรดิ',
        'ฝ่ายยึดอำอาจ',
        'ฝ่ายผัดดีต่อจักรพรรดิ',
        'ฝ่ายไอ้ลิไอ้ควาย'
    ];
    
    for (const name of partyNames) {
        await Party.findOneAndUpdate(
            { name },
            { $setOnInsert: { clicks: 0 } },
            { upsert: true, new: true }
        );
    }
}

// Routes
app.get('/api/parties', async (req, res) => {
    try {
        const parties = await Party.find().sort({ clicks: -1 });
        res.json(parties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/slap', async (req, res) => {
    const { partyName, count } = req.body;
    try {
        const party = await Party.findOneAndUpdate(
            { name: partyName },
            { $inc: { clicks: count || 1 } },
            { new: true }
        );
        res.json(party);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
