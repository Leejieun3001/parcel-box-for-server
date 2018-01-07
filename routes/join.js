const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');

/* 회원가입
* request params :
* memberId (회원 id)
* memberPassWord (회원 password)
* mwemberName (회원 이름)
* memberType (택배기사 : 0 /회원 : 1)
* memberAddress (회원 주소)
*/

router.post('/' , function(req, res){
    var resultJson={
        message : ''
    };
    var JoinParcel_task =[
        //1.connection 가져오기
    function(callback){ 
        pool.getConnection(function(err, connection){
            if(err){
                console.log("getConnection error : " , err);
                callback(err, connection , null);
            }
            else callback(null, connection);
        });
    },
    // 이미 존재하는 회원이지 확인
    function(connection, callback){
        let duplicate_check_query = 
        "select * from user where id = ?";
        connection.query(duplicate_check_query, req.body.memberId, function(err,data){
            if(err){
                console.log("duplicate check select query error : ",err);
                callback(err, connection, null);
            }else {
                if(data.length ==0){
                    //해당 회원이 없는 경우
                    callback(null, connection);
                }else {
                    //해당 회원이 있는 경우
                    res.status(201).send({
                          message : "signup failure",
                           detail : "duplicated email"
                    });
                    callback('ok');
                }
            }
        });
    },
    
    //3. bcrypt로 패스워드 해싱
    function(connection, callback){
        bcrypt.hash(req.body.memberPassword, null, null ,function(err, hash) {
        if(err){
          console.log('bcrypt hashing error : ',err);
          callback(err, connection, null);
        }else{
          callback(null, connection, hash);
        }
      });
    },

    //4. DB에 저장
    function(connection, bcryptedPassword, callback){
       
        let insert_query=
        "insert into user" +
        "(id, password, name, type, address )"+
        "values (?,?,?,?,?)";

        let params =[
            req.body.memberId,
            bcryptedPassword,
            req.body.memberName,
            req.body.memberType,
            req.body.memberAddress
        ];

        connection.query(insert_query, params, function(err,data){
            if(err){
                console.log("insert query error : ", err);
                callback(err, connection, null);
            }
            else{
                      resultJson.message = 'signup success';
                  res.status(201).send({
                      resultJson                        
                    });
                callback(null, connection);
            }
        });
    },
    //5.connection release 
    function(connection, callback){
        connection.release();
        callback(null, null, '-join');

    }

    ];

      async.waterfall(JoinParcel_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }

    if(err){
      if(err!='ok'){
        console.log("async.waterfall error : ",err);
        res.status(503).send({
          message : 'failure'
       
        });
      }
    }
    else {
      console.log(result);
    }
  });
});

/* 이메일 중복 확인
 * request params :
 * tempEamil(query)
 */

router.get('/duplicateCheck', function(req, res){
    var duplicate_check_task =[

        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection){
                if(err){
                    console.log("getConnection error : ", err);
                    callback(err, connection , null);
                }else callback(null, connection);
            });
        },
        //2.이미 존재하는 회원인지 확인
        function (connection, callback){
                let duplicate_check_query = 
                  "select * from user where id = ?";
            connection.query(duplicate_check_query ,req.query.tempEmail, function(err,data){
                if(err){
                    console.log("duplicate check select query error : ",err);
                    callback(err, connection, null);
                }else{
                    if(data.length ==0){
                        res.status(200).send({
                            message : 'no duplication',
                            detail : 'able to sign up'
                        });
                        callback(null, connection);
                    }
                    else {
                        //해당 회원이 있으면 inser 불가
                        res.status(201).send({
                            message : "duplicated",
                            detail : "unable to sign up"
                        });
                        callback('ok', connection);
                    }
                }
            });
        },
        //3. connection release
        function(connection, callback){
            connection.release();
            callback(null, null ,'-join/duplicateCheck ? =');
        }
    ];
    async.waterfall(duplicate_check_task , function(err, connection,result){
        if(connection){
            connection.release();
        }
        if(err){
            if(err!='ok'){
                console.log("async.waterfall error : " ,err );
                res.status(503).send({
                    message: 'failuire',
                    detail : 'internal server error'
                });
            }
        }
        else{
            console.log(result);
        }
    });
});


module.exports = router;