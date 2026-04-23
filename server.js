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
        'ฝ่ายภักดีต่อจักรพรรดิ',
        'ฝ่ายไอ้ลิไอ้ควาย'
    ];
    
    for (const name of partyNames) {
        await Party.findOneAndUpdate(
            { name },
            { $setOnInsert: { clicks: 0 } },
            { upsert: true, returnDocument: 'after' }
        );
    }
}

// Routes
app.get('/api/parties', async (req, res) => {
    try {
        const parties = await Party.find().sort({ clicks: -1 });
        console.log(`Fetched ${parties.length} parties`);
        res.json(parties);
    } catch (err) {
        console.error('Fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/slap', async (req, res) => {
    const { partyName, count } = req.body;
    console.log(`Slap received: ${partyName} +${count}`);
    try {
        const party = await Party.findOneAndUpdate(
            { name: partyName },
            { $inc: { clicks: count || 1 } },
            { returnDocument: 'after' }
        );
        res.json(party);
    } catch (err) {
        console.error('Slap error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
