const mysql = require('mysql');
const pool = require('../config/dbPool');
const express = require('express');
const router = express.Router();
const async = require('async');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
aws.config.loadFromPath('./config/aws_config.json')
const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'parcel-box',
    acl: 'public-read',
    key: function(req, file, cb) {
      cb(null, Date.now() + '.' + file.originalname.split('.').pop())
    }
  })
});

var connect = function(callback) {
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log("get Connection error : ", err);
      callback(err, connection, null);
    } else callback(null, connection);
  });
};

var releaseConnection = function(connection, apiName, callback) {
  connection.release();
  callback(null, null, apiName);
};

/*
 * api 목적        : 택배 운송장 번호 등록하기
 * request params : {string parcel_num: "운송장번호" }
 */
router.post('/registerParcel', upload.single('qrCode'), function(req, res) {
  var resultJson = {
    message: ''
  };

  var selectParcelNum = function(connection, callback) {
    let query = "SELECT p.idx, d.parcel_idx FROM user u " +
      "join parcel p on u.idx = p.user_idx " +
      "left outer join delivery d on p.idx = d.parcel_idx " +
      "where p.parcel_num = ?";
    connection.query(query, req.body.parcel_num, function(error, rows) {
      if (error) {
        callback(error, connection, "Selecet query Error : ");
      } else {
        callback(null, connection, rows);
      }
    });
  };

  //이미 존재하는 운송장 번호인지 확인
  var onSelectParcelNum = function(connection, rows, callback) {
    if (rows.length === 0) {
      // 전달받은 운송장 번호의 parcel 이 존재하지 않는 경우
      console.log("해당 운송장 번호 상품 없음");
      resultJson.message = "NO_PARCEL";
      res.status(201).send(resultJson);
      callback('OK', connection, "api : delivery-select");
    } else if (rows[0].parcel_idx !== null) {
      // 이미 전달받은 운송장 번호의 배송정보가 존재할 때
      resultJson.message = "ALREADY_EXIST";
      res.status(201).send(resultJson);
      callback('OK', connection, "api : delivery-select");
    } else if (rows[0].parcel_idx === null) {
      // 전달받은 운송장 번호의 배송정보가 저장되어 있지 않을 때
      callback(null, connection, rows[0].idx);
    }
  };

  // 전달하는 택배 기사 정보와 택배물 정보를 DB에 insert.
  var insertDelivery = function(connection, parcel_idx, callback) {
    console.log("parcel_idx 2" , parcel_idx);
    let query = "insert into delivery " +
      "(parcel_idx, state, delivery_idx) " +
      "values (?, ?, ?)";
    let params = [
      parcel_idx,
      1,
      req.body.user_idx
    ];
	console.log('insert delivery');
    connection.query(query, params, function(err, data) {
      if (err) {
        console.log("delivery insert query error : ", err);
        res.status(503).send(resultJson);
        callback(err, connection, null);
      } else {
        console.log("parcel num insert success");
        callback(null, connection, parcel_idx);
      }
    });
  };

  var updateQrCode = function(connection, parcel_idx, callback) {
    let query = "update parcel set qr_code = ? where idx = ?";
    let imageUrl = req.file.location || null;
    let param = [
      imageUrl,
      parcel_idx
    ];
    connection.query(query, param, function(err, data) {
      if (err) {
        console.log("update qr code err");
        callback(err, connection, "qrcode update query error : ");
      } else {
        resultJson.message = 'SUCCESS';
        res.status(201).send(resultJson);
        callback(null, connection, 'api : registerParcel');
      }
    });
  };

  var task = [connect.bind(this), selectParcelNum, onSelectParcelNum, insertDelivery, updateQrCode, releaseConnection.bind(this)];

  async.waterfall(task, function(err, connection, result) {
    if (connection) {
      connection.release();
    }

    if (!!err && err !== "OK") {
      console.log(result, err.message);
      resultJson.message = "FAILURE";
      res.status(200).send(resultJson);
    } else {
      console.log(result);
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
    message: '',
    detail: '',
    result: {
      listSize: 0,
      list: []
    }
  };

  var deliveryList = function(connection, callback) {
    let selectQuery = "select parcel.parcel_info, parcel.address, parcel.qr_code, user.name, delivery.state " +
      "from user " +
      "join parcel on user.idx = parcel.user_idx " +
      "join delivery on delivery.parcel_idx = parcel.idx " +
      "where delivery.delivery_idx = ? ";
    connection.query(selectQuery, req.query.user_idx, function(err, data) {
      if (err) {
        console.log("select query err : ", err);
        resultJson.message = 'fail';
        res.status(503).send(resultJson);
        callback(err, connection, null);
      } else {
        if (data.length !== 0) {
          resultJson.message = 'success';
          resultJson.detail = 'get delivery list success';
          resultJson.result.listSize = data.length;

          for (var x in data) {
            let deliveryInfo = {};
            deliveryInfo.parcel_info = data[x].parcel_info;
            deliveryInfo.address = data[x].address;
            deliveryInfo.name = data[x].name;
            deliveryInfo.state = data[x].state;
            deliveryInfo.qrcode = data[x].qr_code;
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

  async.waterfall(task, function(err, connection, result) {
    if (connection) {
      connection.release();
    }

    if (!!err) {
      console.log(result, err);
      resultJson.message = "fail";
      res.status(200).send(resultJson);
    } else {
      console.log(result);
      resultJson.message = 'success';
      res.status(200).send(resultJson);
    }
  });
});

module.exports = router;
