const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const async = require('async');

// test
/*router.get('/', function(req, res) {
        console.log('hyeona1');
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ",err);
        }
        else {
            console.log('hyeona2');
            let select_query = "select * from user";
              connection.query(select_query, function(err, data) {
                if(err) {
                  console.log("select query error : ", err);
                  res.status(503).send(data);
                }
                else{
                    console.log('hyeona4');
                    res.status(201).send(data);
                }
              });
              connection.release();
        }
    });
});

module.exports = router;
