const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
// Load environment variables from .env file
require('dotenv').config();

const token = process.env.LOG_AUTH;
const links = {};
=
// Middleware to check for valid token
const Log = (stack, level, pkg, message) => {
    if (!stack || !level || !pkg || !message) {
        console.error("Invalid log fields:", { stack, level, pkg, message });
        return;
    }

    const logMessage = {
        stack: stack.toLowerCase(),
        level: level.toLowerCase(),
        package: pkg.toLowerCase(),
        message: message.toLowerCase()
    };

    axios.post(
        'http://20.244.56.144/evaluation-service/logs',
        logMessage,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        }
    )
    .then(() => console.log("Log sent successfully"))
    .catch(err => {
        console.error("Log error:", err.response?.data || err.message);
    });
};



// Endpoint to create a short URL
app.post('/shorturls', (req, res) => {
    const { url, validity, shortcode } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Long URL is required' });
    }

    let code = shortcode || Math.random().toString(36).substring(2, 8).toLowerCase();

    while (links[code]) {
        code = Math.random().toString(36).substring(2, 8).toLowerCase();
    }

    const shortUrl = `http://localhost:${port}/${code}`;
    const validMinutes = validity || 30;
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + validMinutes);

    links[code] = {
        longUrl: url,
        expiryDate: expiryDate.toISOString(),
        creationDate: new Date().toISOString(),
        click: []
    };

    Log('backend', 'info', 'service', `short URL created`);

    res.status(201).json({
        shortLink: shortUrl,
        expiry: expiryDate.toISOString()
    });
});

// Endpoint to redirect short URL to long URL
app.get('/:shortcode', (req, res) => {
    const { shortcode } = req.params;
    const link = links[shortcode];

    if (!link) {
        return res.status(404).json({ error: 'Short URL not found' });
    }

    const currentTime = new Date();
    if (currentTime > new Date(link.expiryDate)) {
        delete links[shortcode];
        return res.status(410).json({ error: 'Short URL has expired' });
    }
    //stores the click details
    link.click.push({
        timestamp: currentTime.toISOString(),
        referrer: 'direct_access',
        ip: req.ip
    });

    res.redirect(link.longUrl);
});

// Endpoint to get stats for a specific short URL
app.get('/shorturls/:shortcode/stats', (req, res) => {
    const { shortcode } = req.params;
    const link = links[shortcode];

    if (!link) {
        return res.status(404).json({ error: 'Short URL not found' });
    }

    res.json({
        clicks: link.click.length,
        longUrl: link.longUrl,
        creationDate: link.creationDate,
        expiryDate: link.expiryDate,
        clickDetails: link.click
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
