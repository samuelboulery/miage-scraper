const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: 'output.csv',
    header: [
        { id: 'Product_Name', title: 'Product Name' },
        { id: 'Capacity', title: 'Product Capacity' },
        { id: 'Price', title: 'Price' },
        // Add other headers as needed
    ],
    append: true, // Set this to true so that the CSV writer appends data to the file instead of overwriting it
});

async function scrapeProductData(page, productName) {
    try {
        console.log('Recherche du produit...');

        // Enter the product name in the search bar
        await page.waitForTimeout(1000);
        await page.click('.header-search__input', { clickCount: 3 });
        await page.type('.header-search__input', productName);
        await page.waitForTimeout(1000);

        // Click on search button
        await page.click('.header-search__search-button');
        await page.waitForTimeout(1000);

        console.log('Récuperation des données...');
        const products = await page.$$eval('.product-thumbnail', (products) =>
            products.map((product) => {
                const productName = product.querySelector('.product-thumbnail__description').textContent.trim();
                const productCapacity = product.querySelector('.product-attribute').textContent.trim();

                // Extract product price
                const priceElement = product.querySelector('.product-price');
                const priceText = priceElement ? priceElement.textContent.trim() : '';
                const numericPrice = priceText ? parseFloat(priceText.replace(/[^\d.,]+/g, '').replace(',', '.')) : null;

                return {
                    productName,
                    productCapacity,
                    numericPrice,
                };
            }),
        );
        console.log('Extracted products:', products);
        console.log('Ajout au CSV...');

        // Save the scraped data to the CSV file
        await csvWriter.writeRecords(
            products.map((product) => ({
                Product_Name: product.productName,
                Capacity: product.productCapacity,
                Price: product.numericPrice,
            }))
        )
            .then(() => {
                console.log("CSV file has been written");
            });

    } catch (error) {
        console.error(`Error fetching data: ${error.message}`);
    }

    console.log('Terminé !', '\n');
}

async function scraper(productNames, city) {
    // Launch the browser instance
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Initialisation...');
    // Navigate to the website
    await page.goto('https://www.auchan.fr/', { waitUntil: 'networkidle2' });
    
    console.log('Rejet des cookies...');
    
    // Click on reject button
    await page.waitForSelector('#onetrust-reject-all-handler', { timeout: 5000 });
    await page.click('#onetrust-reject-all-handler');
    await page.waitForTimeout(1000);
    
    console.log(`Sélection du magasin de ${city}...`);

    // Click on the tab to select a shop
    await page.click('.context-header__button');
    await page.waitForSelector('.journey__search-bar', { timeout: 5000 });
    await page.waitForSelector('.shadow--light.journey__search-input.journeySearchInput', { timeout: 5000 });


    // Enter the address in the search bar
    await page.waitForTimeout(1000);
    await page.type('.shadow--light.journey__search-input.journeySearchInput', city, { delay: 100 });
    await page.waitForTimeout(2000);

    // Define the maximum number of retries
    const maxRetries = 3;
    let retries = 0;
    let searchSuggestionFound = false;

    while (retries < maxRetries && !searchSuggestionFound) {
        try {
            // Wait for the first search suggestion to appear
            await page.waitForSelector('#search_suggests > li', { timeout: 5000 });
            searchSuggestionFound = true;
        } catch (error) {
            console.log(`Retry ${retries + 1}: Waiting for search suggestions failed. Retrying...`);
            retries++;
        }
    }

    if (searchSuggestionFound) {
        await page.click('#search_suggests > li');

    } else {
        throw new Error('Failed to find search suggestions after maximum retries.');
    }

    // Click on a shop in the search results
    await page.waitForTimeout(1000);
    await page.click('.btnJourneySubmit');
    await page.waitForTimeout(1000);

    for (const productName of productNames) {
        await scrapeProductData(page, productName);
        await page.waitForTimeout(1000);
    }

    // Close the browser instance when finished
    await browser.close();
};

module.exports = scraper;
