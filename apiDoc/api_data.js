define({ "api": [
  {
    "type": "get",
    "url": "/api/auth",
    "title": "Login",
    "description": "<p>Get auth token for application</p>",
    "group": "Auth",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "optional": false,
            "field": "3xx",
            "description": "<p>Redirect to login screen</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Auth",
    "name": "GetApiAuth"
  },
  {
    "type": "get",
    "url": "/api/token",
    "title": "SaveToken",
    "description": "<p>Save token to file for future uses after callback</p>",
    "group": "Auth",
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Auth",
    "name": "GetApiToken"
  },
  {
    "type": "get",
    "url": "/api/orders/local",
    "title": "Local saved orders",
    "description": "<p>Return last data from orders or notification</p>",
    "group": "Store",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "shopId",
            "description": "<ul> <li>Your shop ID</li> </ul>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "200",
            "description": "<p>Fully formatted list of orders for requirements</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Store",
    "name": "GetApiOrdersLocal"
  },
  {
    "type": "get",
    "url": "/api/orders/:shopId",
    "title": "Orders",
    "description": "<p>get 25 first orders (Receipts) from shop in params</p>",
    "group": "Store",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "shopId",
            "description": "<ul> <li>Your shop ID</li> </ul>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "200",
            "description": "<p>Fully formatted list of orders</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n count: Number,\n results: [{Receipt}],\n type: 'Receipt',\n pagination: {},\n params: {}\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Store",
    "name": "GetApiOrdersShopid"
  },
  {
    "type": "get",
    "url": "/api/receipts/:receiptId",
    "title": "One receipt detail",
    "description": "<p>Get 1 custom order (Receipt) with buyer country info</p>",
    "group": "Store",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "receiptId",
            "description": "<ul> <li>Your shop receipt ID</li> </ul>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "200",
            "description": "<p>with data</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n count: 1,\n results: [{Receipt}],\n type: 'Receipt',\n pagination: {},\n params: {}\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Store",
    "name": "GetApiReceiptsReceiptid"
  },
  {
    "type": "get",
    "url": "/api/receipts/:receiptId/:param/:status",
    "title": "Change status",
    "description": "<p>Find and update one param in order (Receipt)</p>",
    "group": "Store",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "receiptId",
            "description": "<p>Your shop receipt ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "param",
            "description": "<p>action &quot;was_paid&quot; or &quot;was_shipped&quot;</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "status",
            "description": "<p>new status 0 or 1</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "200",
            "description": "<p>return updated order</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n count: 1,\n results: [{Receipt}],\n type: 'Receipt',\n pagination: {},\n params: {}\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Store",
    "name": "GetApiReceiptsReceiptidParamStatus"
  },
  {
    "type": "get",
    "url": "/api/shops",
    "title": "Shops",
    "description": "<p>List available shops on Etsy use <code>page</code> in query to get custom page from 0</p>",
    "group": "Store",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "200",
            "description": "<p>Fully formatted list of shops</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n count: Number,\n results: [{Shop}],\n type: 'Shop',\n pagination: {},\n params: {}\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "./index.js",
    "groupTitle": "Store",
    "name": "GetApiShops"
  },
  {
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "optional": false,
            "field": "varname1",
            "description": "<p>No type.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "varname2",
            "description": "<p>With type.</p>"
          }
        ]
      }
    },
    "type": "",
    "url": "",
    "version": "0.0.0",
    "filename": "./apiDoc/main.js",
    "group": "_home_roma_PhpstormProjects_etsy_api_apiDoc_main_js",
    "groupTitle": "_home_roma_PhpstormProjects_etsy_api_apiDoc_main_js",
    "name": ""
  }
] });
