const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');
const async = require('async');
const express = require('express');
const app = express();
const port = 4444;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const apiUrl = 'https://openapi.etsy.com/v2';
const tokenFilePath = './token/accessTokenTemp.json';
const ordersFilePath = './token/orders.json';

app.use(express.static('apiDoc'));

app.use(cookieParser());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '50mb'
}));
app.use(session({
    cookie: { maxAge: 60000 },
    secret: '6086e7eed4e41a4210741656823da',
    resave: true,
    saveUninitialized: false
}));

app.listen(port, () => console.log(`Example app listening on internal port ${port}!`));

const OAuth = require('oauth');

const oauth = new OAuth.OAuth(
    `${apiUrl}/oauth/request_token`,
    `${apiUrl}/oauth/access_token`,
    'e2zn74oyfcchzz690geo7w7o',
    'xa0iu1flo3',
    '1.0A',
    null,
    'HMAC-SHA1'
);

/**
 * Transform order object to necessary format.
 * Nn some places we could use function to replace keys in object but we don`t need all data from API so manually
 * change that all here.
 * @param orderData
 * @param params
 * @returns {Promise}
 */
const formatOrder = function(orderData, params) {
    return new Promise(function(resolve, reject){
        try {
            let resultOrder = {
                OUTVIO_PARAMS: {
                    API_KEY: params.apiKey,
                    CMS_ID: 'outvio',
                    id: orderData.order_id,
                    dateTime: new moment(orderData.creation_tsz).utc()
                },
                payment: {
                    status: orderData.was_paid ? 'paid' : 'not paid',
                    method: orderData.payment_method,
                    total: orderData.total_price,
                    currency: orderData.currency_code,
                    tax: orderData.total_tax_cost
                },
                products: [],
                client: {
                    delivery: {
                        name: orderData.name,
                        postcode: orderData.zip,
                        countryCode: orderData.Country.iso_country_code,
                        state: orderData.state,
                        city: orderData.city,
                        address:  orderData.first_line || orderData.formatted_address
                    // },
                    // invoicing: {
                    //  //don`t have enough test data to fill this object
                    }
                },
                shipping: {
                    price: orderData.total_shipping_cost,
                    method: 'standard' || 'express',
                    invoiceUrl: null,
                    invoiceNumber: null
                }
            };

            orderData.Listings.map(function (product) {
               let newProduct = {
                   name: product.title,
                   price: product.price,
                   vat: 0, // no info about that so put 0
                   quantity: product.quantity,
                   sku: product.sku.join(',') || product.quantity, // not sure about data from API
                   weight: product.item_weight,
                   description: product.description
               };
               resultOrder.products.push(newProduct);
            });

            resolve(resultOrder);
        } catch (e) {
            return reject(e);
        }
    });
};

const fetchShopOrders = function(shopId) {
    return new Promise(function(resolve, reject){
        try {
            let tokenData = JSON.parse(fs.readFileSync(tokenFilePath));
            let result = {
                status: 200,
                data: {}
            };
            if (!tokenData) {
                return resolve(result)
            }

            oauth.get(`${apiUrl}/shops/${shopId}/receipts?includes=Country,Listings`, tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
                function (err, receipts) {
                    if (err) {
                        result = {
                            status: 500,
                            data: err
                        };
                        return resolve(result);
                    }
                    result.data = receipts;

                    return resolve(result);
                });
        } catch (e) {
            return reject(e);
        }
    });
};


/**
 * Get auth token for application
 */
app.get('/api/auth', function (req, response) {

    oauth.getOAuthRequestToken({
        oauth_callback: `http://localhost:${port}/api/token`
    }, function (err, oauth_token, oauth_token_secret, results) {
        fs.writeFileSync(tokenFilePath, JSON.stringify({
            oauth_token: oauth_token,
            oauth_token_secret: oauth_token_secret
        }));

        if (err) {
            return response.send(err);
        }
        if (results && results.login_url) {
            return response.redirect(results.login_url);
        }
        response.send({
            err: 'Something went wrong'
        });
    });
});

/**
 * save token after callback
 */
app.get('/api/token', function (req, response) {
    try {
        if (!req.query.oauth_token || !req.query.oauth_verifier) {
            return response.send({err: 'No token data'});
        }

        let tokenData = JSON.parse(fs.readFileSync(tokenFilePath));

        Object.assign(tokenData, {
            oauth_token: req.query.oauth_token,
            oauth_verifier: req.query.oauth_verifier
        });

        oauth.getOAuthAccessToken(
            req.query.oauth_token,
            tokenData.oauth_token_secret,
            req.query.oauth_verifier,
            function (err, oauth_access_token, oauth_access_token_secret) {

                tokenData.oauth_access_token = oauth_access_token;
                tokenData.oauth_access_token_secret = oauth_access_token_secret;
                fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData));

                if (err) {
                    return response.send(err);
                }

                return response.sendStatus(200);
            }
        );

    } catch (e) {
        console.log(e);
        response.sendStatus(400);
    }
});


/**
 * List of shops
 */
app.get('/api/shops', function (req, response) {
    let tokenData = JSON.parse(fs.readFileSync(tokenFilePath));
    if (!tokenData) {
        return response.sendStatus(400);
    }

    oauth.get(`${apiUrl}/shops`, tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
        function (err, shops) {
            console.log(err, shops, 'err, shops');
            if (err) {
                return response.send(err);
            }

            return response.send(shops);
        });
});

/**
 * get 25 first orders from shop
 */
app.get('/api/orders/:shopId', async function (req, response) {
    const data = await fetchShopOrders(req.params.shopId);
    return response.status(data.status).send(data.data);
});

/**
 * get one receipt detail
 */
app.get('/api/receipts/:receiptId', function (req, response) {
    let tokenData = JSON.parse(fs.readFileSync(tokenFilePath));
    if (!tokenData) {
        return response.sendStatus(400);
    }

    oauth.get(`${apiUrl}/receipts/${req.params.receiptId}?includes=country`, tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
        function (err, receipts) {
            if (err) {
                return response.status(500).send(err);
            }

            return response.send(receipts);
        });
});

/**
 * action "was_paid" or "was_shipped"
 * status 1 or 0
 * use get for easier testing)
 */
app.get('/api/receipts/:receiptId/:param/:status', function (req, response) {


    let tokenData = JSON.parse(fs.readFileSync(tokenFilePath));
    if (!tokenData || (req.params.param !== 'was_paid' && req.params.param !== 'was_shipped')) {
        return response.sendStatus(400);
    }
    // additional validation will be added later
    let body = {};
    body[req.params.param] = req.params.param !== '0';

    oauth.put(`${apiUrl}/receipts/${req.params.receiptId}`, tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
        body, "application/json",
        function (err, receipt) {
            if (err) {
                return response.status(500).send(err);
            }

            return response.send(receipt);
        });
});

/**
 * Current implementation fetch only 25 (by default API param) orders for store.
 * You can set some other shopID inside function and also set custom time to run cron task currently onec per hour
 */
cron.schedule('17 * * * *', async function () {
    const shopId = 20094949; // my own shop created for testing you can use someone else
    const info = await fetchShopOrders(shopId);
    if (typeof info.data === 'string') {
        info.data = JSON.parse(info.data);
    }

    if (info.status !== 200 && info.data || !info.data.results) {
        console.log('WRONG! ', info);
        return console.error(info.data)
    }

    // async update key and values for order to necessary format
    // use async in case if need some additional requests in future
    async.map(info.data.results, (item, cb) => {
        formatOrder(item, {apiKey: 'e2zn74oyfcchzz690geo7w7o'}).then((formatted) => {
            return cb(null, formatted);
        }).catch(err => {
            return cb(err);
        });
    }, function(err, orders) {
        if (err) {
            return console.error(err);
        }
        fs.writeFileSync(ordersFilePath, JSON.stringify(orders));
        console.info('Done!!');
    });
});