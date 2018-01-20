const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const async = require('async');

var connect = function (callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.log("get Connection error : ", err);
            callback(err, connection, null);
        }
        else callback(null, connection);
    });
};

var releaseConnection = function (connection, apiName, callback) {
    connection.release();
    callback(null, null, apiName);
};

/*
 * api 목적        : 택배 운송장 번호 등록하기
 * request params : {string parcel_num: "운송장번호",
                     int user_idx: 배송시킨 사용자 아이디
                     int parcel_idx : 배송되는 택배물 아이디
                     int state : 배송준비중(0), 배송 중(1), 배송 완료(2)
                     string courier_name : "택배기사 이름" }
 */
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

  var selectParcelNum = function (connection, callback) {
      let duplicate_query = "select * from delivery where parcel_num = ?";
      connection.query(duplicate_query, req.body.parcel_num, function (error, rows) {
           if (error) { callback(error, connection, "Selecet query Error : "); }
           else { callback(null, connection, rows);}
      });
   };

  //이미 존재하는 운송장 번호인지 확인
  var onSelectParcelNum = function(connection, rows, callback) {
    if(rows.length == 0) {   // 해당 운송장 번호가 없는 경우
      console.log("해당 운송장 번호 없음");
      resultJson.message = "success";
      callback(null, connection, "api : delivery-select");
    }
    else {   // 해당 운송장 번호가 있으면 이미 등록한 번호를 insert 시키면 안됨
      console.log("해당 운송장 번호 있음");
      resultJson.message = "fail";
      resultJson.detail = "duplicated parcel number";
      callback("dup", null, "api : delivery-select");
    }
  };

    // 전달하는 택배 기사 정보와 택배물 정보를 DB에 insert.
    var onInsertParcelNum = function(connection, callback) {
      let insert_query =
      "insert into delivery "+
      "(user_idx, parcel_idx, parcel_num, state, courier_name) "+
      "values (?, ?, ?, ?, ?)";
      let params = [
        req.body.user_idx,
        req.body.parcel_idx,
        req.body.parcel_num,
        req.body.state,
        req.body.courier_name
      ];

      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("parcel num insert query error : ", err);
          res.status(503).send(resultJson);
          callback(err, connection, null);
        }
        else{
          console.log("parcel num insert success");
          resultJson.detail = 'delivery register success';
          resultJson.courier_name = req.body.courier_name;
          resultJson.delivery_num = req.body.delivery_num;
          resultJson.delivery_state = 'Preparing to delivery';
          res.status(200).send(resultJson);
        }
      });
    };

    var task = [connect.bind(this), selectParcelNum, onSelectParcelNum, onInsertParcelNum, releaseConnection.bind(this)];

    async.waterfall(task, function (err, connection, result) {
        if (connection) { connection.release(); }

        if (!!err && err == "dup") {
            console.log(result, err);
            resultJson.message = "fail";
            res.status(200).send(resultJson);
        }
        else {
            console.log(result);
            resultJson.message = 'success';
            res.status(200).send(resultJson);
        }
    });
});

/*
 * api 목적        : 배송 목록 보여주기 (택배 기사 관점)
 * request params : { int user_idx : 로그인한 유저(기사) 아이디 }
 * response params : { string parcel_info : 항목
                       string address : 배송 주소
                       string name : 수취인
                       int state : 배송 준비중(0), 배송 중(1), 배송 완료(2) }
 */
router.get('/showDeliveryList', function(req, res) {
  var resultJson = {
    message : '',
    detail : '',
    result : {
      listSize : 0,
      list : [
      ]
    }
  };

  var deliveryList = function(connection, callback) {
    let selectQuery = "select parcel.parcel_info, user.address, user.name, delivery.state " +
                      "from delivery " +
                      "join user on (user.idx = delivery.user_idx) " +
                      "join parcel on (parcel.idx = delivery.parcel_idx) " +
                      "where delivery.user_idx = ? ";
    connection.query(selectQuery, req.query.user_idx, function(err, data) {
      if (err) {
        console.log("select query err : ", err);
        res.status(503).send(resultJson);
        callback(err, connection, null);
      } else {
        if (data.length !== 0) {
          console.log("parcel num insert success");
          resultJson.message = 'success';
          resultJson.detail = 'get delivery list success';
          resultJson.result.listSize = data.length;

          for (var x in data) {
            let deliveryInfo = {};
            deliveryInfo.parcel_info = data[x].parcel_info;
            deliveryInfo.address = data[x].address;
            deliveryInfo.name = data[x].name;
            deliveryInfo.state = data[x].state;
            resultJson.result.list.push(deliveryInfo);
          }
        } else {
          resultJson.detail = 'no_data';
        }
        res.status(200).send(resultJson);
      }
    })
  };

    var task = [connect.bind(this), deliveryList, releaseConnection.bind(this)];

    async.waterfall(task, function (err, connection, result) {
        if (connection) { connection.release(); }

        if (!!err) {
            console.log(result, err);
            resultJson.message = "fail";
            res.status(200).send(resultJson);
        }
        else {
            console.log(result);
            resultJson.message = 'success';
            res.status(200).send(resultJson);
        }
    });
});

module.exports = router;
