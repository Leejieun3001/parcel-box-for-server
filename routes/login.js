const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');

router.post('/', function(req, res, next){
    var onExcuteQuery = function (rows) {
        var resultJson = {
            message: '',
            data : null
        };
        if (rows.length === 0) {
            // 존재하는 아이디가 없는 경우
            resultJson.message = "NO_USER";
            res.status(200).send(resultJson);
        } else {
            bcrypt.compare(req.body.password, rows[0].password, function (err, isCorrect) {
                //isCorrect === true : 일치, isCorrect === false : 불일치
                if(err){
                    resultJson.message = "NO_INFO";
                }else{
                    resultJson.message = 'SUCESS';
                    resultJson.data = rows[0];
                }
                res.status(200).send(resultJson);
            });
        }
    }

    var excuteQuery = function (connection, callback) {
        connection.query('select * from user where id = ?', req.body.id, function(error,rows){
            if(error){
                console.log("Connection Error" + error);
                res.sendStatus(500);
            }
            else{
                onExcuteQuery(rows);
            }
            connection.release();
        });
    }

    var connect = function (callback) {
        pool.getConnection(function(error, connection){
            if (error){ console.log("getConnection Error" + error); res.sendStatus(500); }
            else { callback(connection, onExcuteQuery); }
        });
    };
    
    connect(excuteQuery);
});

module.exports = router;
