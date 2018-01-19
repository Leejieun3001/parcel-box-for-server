const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const aws = require('aws-sdk');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const moment = require('moment');
const async = require('async');
aws.config.loadFromPath('./config/aws_config.json')
const s3 = new aws.S3();
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'parcel-box',
        acl: 'public-read',
        key: function (req, file, cb) {
            cb(null, Date.now() + '.' + file.originalname.split('.').pop())
        }
    })
});

/**
 * qr코드 서버에 저장
 * request params:
 * qrCode
 * parcelNum
 */
router.post('/qrCodeStore', upload.single('qrCode'), function (req, res) {

    var QrcodeUpload_task = [
        //1.connection 
        function (callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
        },
        //2.qrCode등록
        function (connection, callback) {
            let upload_qrCode_query =
                "update parcel " +
                "set qr_code = ?" +
                "where parcel_num =?";

            let imageUrl;
            if (!req.file) imageUrl = null;
            else imageUrl = req.file.location;
            let record = [
                imageUrl,
                req.body.parcelNum
            ];

            connection.query(upload_qrCode_query, record, function (err, data) {
                if (err) {
                    console.log("update query error : ", err);
                    callback(err, connection, null);
                } else {
                    res.status(201).send({
                        message: 'ok'
                    });
                    callback(null, connection);
                }
            });
        },
        //3.connection release
        function (connection, callback) {
            connection.release();
            callback(null, null, 'ststusMsg');
        }
    ];

    async.waterfall(QrcodeUpload_task, function (err, connection, result) {
        if (connection) {
            connection.release();
        }
        if (err) {
            if (err != 'ok') {
                console.log("async.waterfall error : ", err);
                res.status(503).send({
                    message: 'failure',
                    detail: 'internel server error'
                });
            }
        } else {
            console.log(result);
        }
    });
});

module.exports = router;
