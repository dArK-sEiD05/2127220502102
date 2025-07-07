const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
const token = process.env.LOG_AUTH_TOKEN;
const links = {};
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
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzdXJ5YWRldjU4MDlAZ21haWwuY29tIiwiZXhwIjoxNzUxODgxNTc5LCJpYXQiOjE3NTE4ODA2NzksImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI1M2QzMDFiMi02MTE2LTQ3OTAtOWQ4Ni1mOGMyMDQ1YTZlMjEiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJyIGcgc3VyeWEgZGV2Iiwic3ViIjoiOTFjZGI2NWEtNmY4NS00ZjhhLTkwZDUtZDhjODhhMDk4ZDMyIn0sImVtYWlsIjoic3VyeWFkZXY1ODA5QGdtYWlsLmNvbSIsIm5hbWUiOiJyIGcgc3VyeWEgZGV2Iiwicm9sbE5vIjoiMjEyNzIyMDUwMjEwMiIsImFjY2Vzc0NvZGUiOiJaUnNZWHgiLCJjbGllbnRJRCI6IjkxY2RiNjVhLTZmODUtNGY4YS05MGQ1LWQ4Yzg4YTA5OGQzMiIsImNsaWVudFNlY3JldCI6IktERmhLa2hrS2p1d3BSQkoifQ.4lh6peYrjNwkshQbX3EGKaOIWIl5vUs21zcFkDdk8ck`,
            }
        }
    )
    .then(() => console.log("Log sent successfully"))
    .catch(err => {
        console.error("Log error:", err.response?.data || err.message);
    });
};




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

    link.click.push({
        timestamp: currentTime.toISOString(),
        referrer: 'direct_access', // This can be enhanced to capture actual referrer
        ip: req.ip
    });

    res.redirect(link.longUrl);
});


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
