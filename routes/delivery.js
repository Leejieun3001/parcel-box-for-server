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
});*/

// 택배 등록하기
router.post('/registerParcel', function(req, res) {
  var resultJson = {
    message : '',
    detail : '',
    courier_name : '',
    courier_phone : '',
    courier_company : '',
    delivery_num : '',
    delivery_name : '',
    delivery_state : ''
  };

  var registerParcel_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ", err);
          callback(err, connection, null);
        }
        else callback(null, connection);
      });
    },
    //2. 이미 존재하는 운송장 번호인지 확인
    function(connection, callback) {
      let duplicate_check_query = "select * from parcel where parcel_num = ?";
      connection.query(duplicate_check_query, req.body.parcel_num, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ", err);
          callback(err, connection, null);
        } else {
          if(data.length == 0) {   // 해당 운송장 번호가 없는 경우
            console.log("해당 운송장 번호 없음");
            callback(null, connection);
          }
          else{   // 해당 운송장 번호가 있으면 이미 등혹한 번호기에 insert 시키면 안됨
            console.log("해당 운송장 번호 있음");
            res.status(201).send({
              message : "register failure",
              detail : "duplicated parcel number"
            });
            callback('ok');
          }
        }
      });
    },

    //3. 전달하는 택배 기사 정보와 택배물 정보를 DB에 insert한다.
    function(connection, bcryptedPassword ,callback) {
      let insert_query =
      "insert into delivery "+
      "(user_idx, parcel_idx, parcel_num, state) "+
      "values (?, ?, ?)";
      let params = [
        req.body.user_idx,
        req.body.parcel_idx,
        req.body.parcel_num,
        req.body.state
      ];

      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("insert query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'delivery register success';
          resultJson.courier_name = req.body.user_id;
          resultJson.delivery_num = req.body.delivery_num;
          resultJson.delivery_state = 'Preparing to delivery';
          console.log("insert success");
          //callback(null, connection);
        }
      });
    },

/*
message : '',
detail : '',
courier_name : '',
courier_phone : '',
courier_company : '',
delivery_num : '',
delivery_name : '',
delivery_state : ''
*/

    // //5. 회원가입 성공 후, 토큰 발급
    // function(connection, callback) {
    //   let select_query = "select member_id from Member where email = ?";
    //   connection.query(select_query, req.body.memberEmail, function(err, data) {
    //     if(err){
    //       console.log("select query error while makeToken : ",err);
    //       callback(err, connection, null);
    //     }else{
    //       if(data.length==0){   // 해당회원이 없는 경우
    //         res.status(201).send({
    //           message : "signup failure",
    //           detail : "while making token"
    //         });
    //         callback(null, connection);
    //       }
    //       else{   // 해당회원이 있으면 토큰 발급
    //         let tokenString = jwtModule.makeToken(data[0]);
    //         resultJson.member_token = tokenString;
    //         res.status(201).send(resultJson);
    //         callback(null, connection);
    //       }
    //     }
    //   });
    // },
    //6. connection release
    function(connection, callback) {
      connection.release();
      //callback(null, null, '-signup/model/email');
    }
  ];

  async.waterfall(registerParcel_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }

    if(err){
      if(err!='ok'){
        console.log("async.waterfall error : ",err);
        res.status(503).send({
          message : 'failure',
          detail : 'internal server error'
        });
      }
    }
    else {
      console.log(result);
    }
  });
});

module.exports = router;
