const jwt = require('jsonwebtoken');
const jwtSecret = require('../config/secretKey');
const secretKey = jwtSecret.secret;

//JWT 토큰 설정값
const option = {
  algorithm : 'HS256', //토큰 암호화 방식
  expiresIn :  "7d"    //토큰의 유효기간
};
const payload = {
  id : 0
};

//토큰 발급하기
function makeToken (value) {
  if(!value.id){
    value.id = 0;
  }
  payload.id = value.id;
  var token = jwt.sign(payload, secretKey, option);
  return token;
}

//토큰 해석하기
function decodeToken (token) {
    //decoded.memberId 로 memberId를 참고할 수 있다.
    var decoded = "";
    if(!token) {
      console.log("Token is not exist or expired");
      decoded = 1;
      return decoded;
    }
    else{
    //  console.log("Auto login Error");
      decoded = jwt.verify(token, secretKey);
      return decoded;
    }
}

module.exports.makeToken = makeToken;
module.exports.decodeToken = decodeToken;
