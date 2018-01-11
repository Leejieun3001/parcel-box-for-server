const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
//이메일 인증 
const nodemailer = require('nodemailer');

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
        bcrypt.hash(req.body.memberPassword, null ,null,function(err, hash) {
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

/**email 인증
 * request params:
 * memberId
 */
router.get('/verificationCode', function(req, res){

    var Transport = nodemailer.createTransport({
        service : "Gmail",
        auth : {
            user : "jieun3001",         
            pass : "30905dlwldms!"
        }
    });
    var rand;
    var resultJson = {
        message: '',
        verificationCode: ''
       }; 
    var verificationCode_task =[
  // 1. connection 가져오기
   function(callback){ 
        pool.getConnection(function(err, connection){
            if(err){
                console.log("getConnection error : " , err);
                callback(err, connection , null);
            }
            else callback(null, connection);
        });
    },
    // 2.이미 존재하는 회원이지 확인
    function(connection, callback){
         let duplicate_check_query = 
                  "select * from user where id = ?";
            connection.query(duplicate_check_query ,req.query.tempEmail, function(err,data){
                if(err){
                    console.log("duplicate check select query error : ",err);
                    callback(err, connection, null);
                }else{
                    if(data.length ==0){
                        callback(null, connection);                   
                    }
                    else {               
                        res.status(201).send({
                            message : "duplicated",
                            detail : "unable to sign up"
                        });
                        callback('ok');                     
                    }
                }
            });
    },
     function(connection, callback){
            console.log(req.query.tempEmail);
            rand=Math.floor((Math.random() * 10000));
            let mailOption = {
                to : req.query.tempEmail,
                subject : "안녕하세요. safe,save! 입니다.",
                html : "안녕하세요,<br> 고객님의 인증번호는 "+rand+"입니다. <br>"
                +"<br>어플로 돌아가셔서 인증번호를 입력해 주세요.</br>"
                +"<br>감사합니다.</br>"
            };
            console.log("gkgkgk");

            Transport.sendMail(mailOption,function (error, info) {
                if(error){
                    return console.log(error);
                }else{
                    resultJson.message = 'email success';
                    resultJson.verificationCode = rand;
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
        callback(null, null, '-verificationCode');
    }
    ];
    async.waterfall(verificationCode_task , function(err, connection,result){
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