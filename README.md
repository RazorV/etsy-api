#Etsy API

## Installation

 - Set your own environment in `docker-compose.yml` 
 - Run command to check `docker-compose up`
 - `index.js:384` open this file and found line
 `cron.schedule('28 * * * *', function ()` 
 change time for cron task to get parsed file 

## Check

 - Open http://localhost:4444/api/auth to authorize your user (without this cron will not work)

 - Sample urls for my shop and user 
 http://localhost:4444/api/orders/20094949
 http://localhost:4444/api/shops
 http://localhost:4444/api/receipts/1452932363/was_shipped/1 -- example update some order option