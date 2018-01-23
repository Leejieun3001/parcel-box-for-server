var express = require('express');
var router = express.Router();
const mysql = require('mysql');
const pool = require('../config/dbPool');
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');

var connect = function (callback) {
  pool.getConnection(function (err, connection) {
    if (err) {
      console.log("get Connection error : ", err);
      callback(err, connection, null);
    }
    else callback(null, connection);
  });
}

var releaseConnection = function (connection, apiName, callback) {
  connection.release();
  callback(null, null, apiName);
};

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

/**
 * api 목적        : 아이디 찾기
 * request params : {string name: "이름", int phone: "핸드폰번호"}
 */
router.get('/get_parcel', function (req, res) {
  var resultJson = {
    message: '',
    data: {}
  };

  var onSelectParcel = function (connection, rows, callback) {
    if (rows.length === 0) {
      // 해당 회원이 없는 경우
      resultJson.message = "NO_DATA";
    } else {
      // 해당 회원이 있는 경우
      resultJson.message = "EXIST_DATA";
      resultJson.data = rows;
    }
    res.status(201).send(resultJson);
    callback(null, connection, "api : get_parcel");
  }

  var selectParcel = function (connection, callback) {
    var decodedToken = jwtModule.decodeToken(req.headers.token);
    let sql = "SELECT d.state, p.parcel_num, d.courier_name, p.qr_code, p.parcel_info "
                + "FROM `parcel-box`.user u "
                + "right outer join delivery d on u.idx = d.user_idx "
                + "left outer join parcel p on d.parcel_idx = p.idx "
                + "WHERE u.idx = 1";

    connection.query(sql, function (err, rows) {
      if (err) { callback(err, connection, "Select query Error : "); }
      else { callback(null, connection, rows); }
    });
  }

  var task = [connect.bind(this), selectParcel, onSelectParcel, releaseConnection.bind(this)];

  async.waterfall(task, function (err, connection, result) {
    if (connection) { connection.release(); }

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

module.exports = router;
