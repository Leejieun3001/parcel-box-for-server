const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const async = require('async');
const multer = require('multer');
const multerS3 = require('multer-s3');
aws.config.loadFromPath = ('../config/aws_config.json');
const s3 = new aws.S3();
const upload = multer({
    storage : multerS3({
        s3: s3,
        bucket : 'parcel-box',
        acl: 'public-read',
        key : function (req, file, cb){
            cb(null, Date.now() +'.'+ file.originalname.split('.').pop())
        }
    })
});

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

module.exports = router;
