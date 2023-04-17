const express = require('express');
const { engine } = require('express-handlebars');
const scraper = require('./scraper');
const path = require('path');
const session = require('express-session');


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // For development, set secure to false. For production, set to true.
}));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/download', (req, res) => {
    const file = path.join(__dirname, 'output.csv');
    res.download(file);
});

app.get('/loading', (req, res) => {
    res.render('loading');
});

app.get('/result', (req, res) => {
    res.render('result');
});

app.get('/test-results', (req, res) => {
    // Create sample data for testing purposes
    const sampleData = [
        {
            Product_Name: "Coca Cola",
            Capacity: "1.5L",
            Price: 1.99
        },
        {
            Product_Name: "Ice Tea",
            Capacity: "1.5L",
            Price: 2.49
        }
    ];

    res.render('result', { data: sampleData });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.post('/', (req, res) => {
    req.session.productNames = req.body.productNames.split(',').map(name => name.trim());
    req.session.city = req.body.city;
    res.redirect('/loading');
});

app.post('/scrape', async (req, res) => {
    const productNames = req.session.productNames;
    const city = req.session.city;

    try {
        await scraper(productNames, city);
        res.render('result');
    } catch (error) {
        res.status(500).send('An error occurred while scraping: ' + error.message);
    }
});