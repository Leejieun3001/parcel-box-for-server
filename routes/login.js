const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');
var COMPLETE = 'COMPLETE';

router.post('/', function (req, res, next) {
    var onExcuteQuery = function (rows) {
        var resultJson = {
            message: '',
            data: null
        };
        if (rows.length === 0) {
            // 존재하는 아이디가 없는 경우
            resultJson.message = "NO_USER";
            res.status(200).send(resultJson);
        } else {
            bcrypt.compare(req.body.password, rows[0].password, function (err, isCorrect) {
                //isCorrect === true : 일치, isCorrect === false : 불일치
                if (err) {
                    resultJson.message = "NO_INFO";
                } else {
                    resultJson.message = 'SUCESS';
                    resultJson.data = rows[0];
                }
                res.status(200).send(resultJson);
            });
        }
    }

    var excuteQuery = function (connection, callback) {
        connection.query('select * from user where id = ?', req.body.id, function (error, rows) {
            if (error) {
                console.log("Connection Error" + error);
                res.sendStatus(500);
            }
            else {
                onExcuteQuery(rows);
            }
            connection.release();
        });
    }

    var connect = function (callback) {
        pool.getConnection(function (error, connection) {
            if (error) { console.log("getConnection Error" + error); res.sendStatus(500); }
            else { callback(connection, onExcuteQuery); }
        });
    };

    connect(excuteQuery);
});

router.post('/find_id', function (req, res, next) {
    var resultJson = {
        id: '',
        message: ''
    };

    var connect = function (callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                console.log("getConnection error : ", err);
                callback(err, connection, null);
            }
            else callback(null, connection);
        });
    }

    var selectId = function (connection, callback) {
        let sql = "select * from user where id = ? and phone = ?";
        let param = [req.body.memberId, req.body.phone];
        connection.query(sql, param, function (err, rows) {
            if (err) {
                console.log("duplicate check select query error : ", err);
                callback(err, connection, null);
            } else {
                if (rows.length === 0) {
                    //해당 회원이 없는 경우
                    resultJson.message = '해당하는 회원의 정보가 없습니다.';
                    res.status(201).send({ resultJson });
                    callback(null, connection);
                } else {
                    //해당 회원이 있는 경우
                    var id = rows[0].id.split("@");
                    var length = id[0].length;

                    if (length > 10) { id[0] = "**" + id[0].substring(2, 4) + "**" + id[0].substring(6, 8) + "*" + id[0].substring(9); }
                    else if (length > 6) { id[0] = "*" + id[0].substring(1, 2) + "*" + id[0].substring(3, 4) + "*" + id[0].substring(5); }
                    else if (length > 3) { id[0] = "***" + id[0].substring(3); }
                    else if (length > 1) { id[0] = "*" + id[0].substring(1); }

                    resultJson.message = "EXIST_MEMBER";
                    resultJson.id = id[0] + id[1]
                    res.status(201).send({ resultJson });
                    callback(COMPLETE);
                }
            }
        });
    }

    var releaseConnection = function (connection, callback) {
        connection.release();
        callback(null, null, 'api : find_id');
    };
    var task = [connect, selectId, releaseConnection];

    async.waterfall(JoinParcel_task, function (err, connection, result) {
        if (connection) {
            connection.release();
        }

        if (!!err && err !== COMPLETE) {
            console.log("async.waterfall error : ", err);
            resultJson.message = "FAILURE";
            res.status(503).send(resultJson);
        }
        else {
            console.log(result);
        }
    });
});


module.exports = router;