const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});


module.exports = router;
