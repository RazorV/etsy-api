const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');
const async = require('async');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const apiUrl = 'https://openapi.etsy.com/v2';
const tokenFilePath = './token/accessTokenTemp.json';
const ordersFilePath = './token/orders.json';

const port = process.env.PORT || 4444;
const apiKey = process.env.API_KEY || 'e2zn74oyfcchzz690geo7w7o';
const apiSecret = process.env.API_SECRET || 'xa0iu1flo3';
const testShopId = process.env.SHOP_ID || 20094949; // my own shop created for testing you can should use your own

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
    apiKey,
    apiSecret,
    '1.0A',
    null,
    'HMAC-SHA1'
);
/**
 * Read token info
 */
const getTokenFromFile = function () {
    return new Promise(function(resolve, reject){
        if (!fs.existsSync(tokenFilePath)) {
            return reject({err: 'Token not found'});
        }
        try {
            resolve(JSON.parse(fs.readFileSync(tokenFilePath)))
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Transform order object to necessary format.
 * Nn some places we could use function to replace keys in object but we don`t need all data from API so manually
 * change that all here.
 * @param {object} orderData
 * @param {object} params
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

            orderData.Listings.map(function (product, index) {
               let newProduct = {
                   name: product.title,
                   price: orderData.Transactions[index].price,
                   vat: 0, // didn`t found info about that so put 0
                   quantity: orderData.Transactions[index].quantity,
                   sku: orderData.Transactions[index].sku, // not sure about data from API
                   weight: product.item_weight,
                   description: product.description
               };
               resultOrder.products.push(newProduct);
            });

            return resolve(resultOrder);
        } catch (e) {
            return reject(e);
        }
    });
};

const fetchShopOrders = function(shopId, page = 0, limit = 25) {
    return new Promise(async function(resolve, reject){
        try {
            let tokenData = await getTokenFromFile();
            let result = {
                status: 200,
                data: {}
            };
            if (!tokenData) {
                return resolve(result)
            }

            oauth.get(`${apiUrl}/shops/${shopId}/receipts?includes=Country,Transactions,Listings&limit=${limit}&offset=${page*limit}`,
                tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
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
 * @api {get} /api/auth Login
 * @apiDescription Get auth token for application
 * @apiGroup Auth
 *
 * @apiSuccess 3xx Redirect to login screen
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
 * @api {get} /api/token SaveToken
 * @apiDescription Save token to file for future uses after callback
 * @apiGroup Auth
 *
 */
app.get('/api/token', async function (req, response) {
    try {
        if (!req.query.oauth_token || !req.query.oauth_verifier) {
            return response.send({err: 'No token data'});
        }

        let tokenData = await getTokenFromFile();

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
 * @api {get} /api/shops Shops
 * @apiDescription List available shops on Etsy use `page` in query to get custom page from 0
 * @apiGroup Store
 *
 * @apiSuccess {Object} 200 Fully formatted list of shops
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      count: Number,
 *      results: [{Shop}],
 *      type: 'Shop',
 *      pagination: {},
 *      params: {}
 *     }
 */
app.get('/api/shops', async function (req, response) {
    let tokenData = await getTokenFromFile();
    if (!tokenData) {
        return response.sendStatus(400);
    }

    oauth.get(`${apiUrl}/shops?offset=${25 * (req.query.page || 0)}`, tokenData.oauth_access_token, tokenData.oauth_access_token_secret,
        function (err, shops) {
            if (err) {
                return response.status(400).send(err);
            }
            return response.send(shops);
        });
});

/**
 * @api {get} /api/orders/local Local saved orders
 * @apiDescription Return last data from orders or notification
 * @apiGroup Store
 *
 * @apiParam {Number} shopId - Your shop ID
 *
 * @apiSuccess {Array} 200 Fully formatted list of orders for requirements
 */
app.get('/api/orders/local', async function (req, response) {
    if (!fs.existsSync(ordersFilePath)) {
        return response.status(500).send({err: 'File not found'});
    }
    const data = JSON.parse(fs.readFileSync(ordersFilePath));
    return response.send(data);
});

/**
 * @api {get} /api/orders/:shopId Orders
 * @apiDescription get 25 first orders (Receipts) from shop in params
 * @apiGroup Store
 *
 * @apiParam {Number} shopId - Your shop ID
 *
 * @apiSuccess {Object} 200 Fully formatted list of orders
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      count: Number,
 *      results: [{Receipt}],
 *      type: 'Receipt',
 *      pagination: {},
 *      params: {}
 *     }
 */
app.get('/api/orders/:shopId', async function (req, response) {
    const data = await fetchShopOrders(req.params.shopId);
    return response.status(data.status).send(data.data);
});

/**
 * @api {get} /api/receipts/:receiptId One receipt detail
 * @apiDescription Get 1 custom order (Receipt) with buyer country info
 * @apiGroup Store
 *
 * @apiParam {Number} receiptId - Your shop receipt ID
 *
 * @apiSuccess {Object} 200 with data
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      count: 1,
 *      results: [{Receipt}],
 *      type: 'Receipt',
 *      pagination: {},
 *      params: {}
 *     }
 */
app.get('/api/receipts/:receiptId', async function (req, response) {
    let tokenData = await getTokenFromFile();
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
 * we use Get to simplify testing but this is POST/PUT only
 * @api {get} /api/receipts/:receiptId/:param/:status Change status
 * @apiDescription Find and update one param in order (Receipt)
 * @apiGroup Store
 *
 * @apiParam {Number} receiptId Your shop receipt ID
 * @apiParam {String} param action "was_paid" or "was_shipped"
 * @apiParam {Number} status new status 0 or 1
 *
 * @apiSuccess {Object} 200 return updated order
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      count: 1,
 *      results: [{Receipt}],
 *      type: 'Receipt',
 *      pagination: {},
 *      params: {}
 *     }
 */
app.get('/api/receipts/:receiptId/:param/:status', async function (req, response) {
    let tokenData = await getTokenFromFile();
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
cron.schedule('45 * * * *', function () {
    const pageSize = 25;
    let step = 0;
    let nextPage = 1;
    let allData = [];
    async.until(
        () => {
            return step !== 0 && nextPage === null;
        },
        function (cb) {
            fetchShopOrders(testShopId, step, pageSize).then(function (info) {
                if (typeof info.data === 'string') {
                    info.data = JSON.parse(info.data);
                }
                nextPage = (info.data.pagination || {}).next_page || null;

                if (info.status !== 200 && info.data || !info.data.results) {
                    console.log('WRONG! ', info);
                    step++;
                    return cb('err');
                }

                // async update key and values for order to necessary format
                // use async in case if need some additional requests in future
                async.map(info.data.results, (item, mapCb) => {
                    formatOrder(item, {apiKey: apiKey}).then((formatted) => {
                        return mapCb(null, formatted);
                    }).catch(err => {
                        return mapCb(err);
                    });
                }, (err, orders) => {
                    if (err) {
                        return console.error(err);
                    }
                    allData = allData.concat(orders);
                    // fs.writeFileSync(ordersFilePath, JSON.stringify(allData));
                    console.info(`Step ${step} done!!`);
                    step++;
                    cb();
                });
            });
        },
        function (err) {
            if (err) {
                return console.error(err);
            }
            fs.writeFileSync(ordersFilePath, JSON.stringify(allData));
        }
    );
});