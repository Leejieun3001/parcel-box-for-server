const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');

var connect = function (callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.log("getConnection error : ", err);
            callback(err, connection, null);
        }
        else callback(null, connection);
    });
}

var releaseConnection = function (connection, apiName, callback) {
    connection.release();
    callback(null, null, apiName);
};

router.post('/', function (req, res, next) {
    var resultJson = {
        message: '',
        data: null
    };

    var onSelectUserInfo = function (connection, rows, callback) {
        if (rows.length === 0) {
            // 존재하는 아이디가 없는 경우
            resultJson.message = "NO_USER";
            res.status(200).send(resultJson);
            callback(null, connection, "api : login");
        } else {
            bcrypt.compare(req.body.password, rows[0].password, function (err, isCorrect) {
                // isCorrect === true : 일치, isCorrect === false : 불일치
                if (err) {
                    resultJson.message = "NO_INFO";
                    res.status(200).send(resultJson);
                    callback(err, connection, "Bcrypt Error: "); 
                }
                
                if (!isCorrect) {
                    resultJson.message = "INCORRECT";
                } else {
                    resultJson.message = "SUCESS";
                    resultJson.data = rows[0];
                }
                res.status(200).send(resultJson);
                callback(null, connection, "api : login");
            });
        }
    }

    var selectUserInfo = function (connection, callback) {
        connection.query('select * from user where id = ?', req.body.id, function (error, rows) {
            if (error) { callback(error, connection, "Selecet query Error"); }
            else { callback(null, connection, rows); }
        });
    }

    var task = [connect.bind(this), selectUserInfo, onSelectUserInfo, releaseConnection.bind(this)];

    async.waterfall(task, function (err, connection, result) {
        if (connection) {
            connection.release();
        }

        if (!!err) {
            console.log(result, err);
            resultJson.message = "FAILURE";
            res.status(503).send(resultJson);
        }
        else {
            console.log(result);
        }
    });
});

router.post('/find_id', function (req, res, next) {
    var resultJson = {
        id: '',
        message: ''
    };

    var onSelectId = function (connection, rows, callback) {
        if (rows.length === 0) {
            // 해당 회원이 없는 경우
            resultJson.message = "NO_USER";
            res.status(201).send(resultJson);
        } else {
            // 해당 회원이 있는 경우
            var id = rows[0].id.split("@");
            var length = id[0].length;

            // 아이디 변조해서 보내기
            if (length > 10) { id[0] = "**" + id[0].substring(2, 4) + "**" + id[0].substring(6, 8) + "*" + id[0].substring(9); }
            else if (length > 6) { id[0] = "*" + id[0].substring(1, 2) + "*" + id[0].substring(3, 4) + "*" + id[0].substring(5); }
            else if (length > 3) { id[0] = "***" + id[0].substring(3); }
            else if (length > 1) { id[0] = "*" + id[0].substring(1); }

            resultJson.message = "EXIST_MEMBER";
            resultJson.id = id[0] + + "@" + id[1];
            res.status(201).send(resultJson);
        }
        callback(null, connection, "api : find_id");
    }

    var selectId = function (connection, callback) {
        let sql = "select * from user where name = ? and phone = ?";
        let param = [req.body.name, req.body.phone];
        
        connection.query(sql, param, function (err, rows) {
            if (err) { callback(err, connection, "Select query Error : "); }
            else { callback(null, connection, rows); }
        });
    }

    var task = [connect.bind(this), selectId, onSelectId, releaseConnection.bind(this)];

    async.waterfall(task, function (err, connection, result) {
        if (connection) {
            connection.release();
        }

        if (!!err) {
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