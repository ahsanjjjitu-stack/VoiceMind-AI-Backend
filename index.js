require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRouters = require('./auth');
const recordingRouters = require('./recordingai');

// set dns servers to avoid DNS resolution issues
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err));



// user auth all

app.use('/api/auth', authRouters);


// recording routes
app.use('/api/recording', recordingRouters);














const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


