const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');

  
router.get('/', function(req, res, next) {
    res.render('member', { title: 'member' });
});

router.post('/login', function(req, res, next){
    var onExcuteQuery = function (rows) {
        console.log('onExcuteQuery');
        var resultJson = {
            message: '',
            data : null
        };
        if (rows.length === 0) {
            // 존재하는 아이디가 없는 경우
            resultJson.message = "NO_USER";
        } else {
            // bcrypt.compare("비교대상문자열","DB에 저장된 패스워드",function(err,result){//});
            bcrypt.compare(req.body.password, rows[0].password, function (err, isCorrect) {
                //isCorrect === true : 일치, isCorrect === false : 불일치
                if(err){
                    resultJson.message = "NO_INFO";
                    console.log('비교할 데이터', req.body.password, rows[0].password);
                    console.log('bcrypt compare error : ', err);
                }else{
                    if(isCorrect){
                        let token = jwtModule.makeToken(rows[0]);
                        resultJson.message = 'SUCESS';
                        resultJson.data = rows[0];
                    }
                    else{
                        resultJson.message = "NO_PASSWORD";
                    }
                }
                res.status(200).send(resultJson);
            });
        }
    }

    var excuteQuery = function (connection, callback) {
        console.log('excuteQuery');
        connection.query('select * from user where id = ?', req.body.id, function(error,rows){
            console.log('hyeona');
            if(error){
                console.log("Connection Error" + error);
                res.sendStatus(500);
            }
            else{
                console.log(rows[0]);
                onExcuteQuery(rows);
            }
            connection.release();
        });
    }

    var connect = function (callback) {
        console.log('connect');
        pool.getConnection(function(error, connection){
            if (error){ console.log("getConnection Error" + error); res.sendStatus(500); }
            else { callback(connection, onExcuteQuery); }
        });
    };
    
    // connect(excuteQuery);

    var connect = function(callback) {
        pool.getConnection(function(err, connection) {
            if(err) {
                console.log("getConnection error : ",err);
                res.sendStatus(500);
            }
                else return callback(connection);
            });
        }
    var task = [];
    async.waterfall(login_task, function(err, connection, result) {
        if(connection){
          connection.release();
        }
    
        if(err){
            console.log("async.waterfall error : ",err);
            res.status(503).send(result);
        }
        else {
          res.status(201).send(result);
          console.log(resultJson);
        }
      });
});

module.exports = router;
