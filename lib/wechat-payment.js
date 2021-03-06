const { BaseRequest } = require('./base')
const util = require('./util')
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const https = require('https')
const { md5 } = require('./crypto')
const { ResponseError } = require('./error')
const { createDecipheriv } = require('crypto')

class WechatPayment extends BaseRequest {
  /**
   * Wechat payment
   *
   * @param {Object} params
   * 	- mch_id
   * 	- appid
   *
   * @param {Object} config
   *  - pfx
   *  - passphrase
   *  - apiKey
   *
   */
  constructor(params, config) {
    config = { ...config }
    config.request = { timeout: 5 * 1000, method: 'post', ...config.request }
    if (config.pfx)
      config.request.httpsAgent = new https.Agent({
        pfx: config.pfx,
        passphrase: config.passphrase,
      })
    super(params, config, 'https://api.mch.weixin.qq.com/' + (config.sandbox ? 'sandboxnew/' : ''))
  }

  /**
   * post data api
   * post and parse xml data
   * create nonce str
   * sign data
   *
   * @api public
   * @param {String} path
   * @param {Object} config
   *
   */
  post(path, data, config) {
    config = Object.assign({}, config)
    const apiKey = config.apiKey || this.$config.apiKey
    if (!apiKey) throw new Error(`config.apiKey required`)
    config.params = Object.assign({}, config.params)
    config.headers = Object.assign({}, config.headers)

    data = { ...this.$params, ...data }
    data.nonce_str = data.nonce_str || WechatPayment.nonce()
    data.sign = WechatPayment.sign(data, apiKey)
    config.data = WechatPayment.stringifyXML({ xml: data })

    // apiKey
    return this.$req.request(path, config).then((res) => {
      let data = res.data
      let xml
      //Transform buffer
      data = data instanceof Buffer ? data.toString('utf8') : data
      if (typeof data === 'string') {
        xml = data
        data = WechatPayment.parseXML(data)
      }
      data = data && data.xml
      if (!data || !data.return_code) throw new ResponseError('api response empty', -1, xml)
      if (data.return_code != 'SUCCESS') {
        // https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=23_1&index=2
        // return_msg
        throw new ResponseError(data.retmsg || data.return_msg, data.retcode, xml)
      }
      // Check result sign
      if (!config.ignoreResultSign && data.sign != WechatPayment.sign(data, apiKey)) {
        throw new ResponseError('sign error', -2, xml)
      }
      // Check result code
      if (!config.ignoreResultCode && data.result_code != 'SUCCESS') {
        throw new ResponseError(data.err_code_des, data.err_code, xml)
      }
      return data
    })
  }

  static parseXML(data) {
    return util.simplifyXML(util.parseXML(data))
  }

  static stringifyXML(data) {
    return util.stringifyXML(data)
  }

  static sign(params, apiKey) {
    const qs =
      Object.keys(params)
        .filter((key) => key != 'sign')
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&') +
      '&key=' +
      apiKey
    return md5(qs).toUpperCase()
  }

  static nonce(length = 32) {
    const maxPos = CHARS.length
    let nonceStr = ''
    for (var i = 0; i < length; i++) {
      nonceStr += CHARS.charAt(Math.floor(Math.random() * maxPos))
    }
    return nonceStr
  }

  static decryptRefundInfo(data, apiKey, iv = '') {
    const key = md5(apiKey).toLowerCase()
    const decipher = createDecipheriv('aes-256-ecb', key, iv)
    decipher.setAutoPadding(true)
    const deciphered = Buffer.concat([decipher.update(data, 'base64'), decipher.final()])
    const xml = deciphered.toString()
    return WechatPayment.parseXML(xml)
  }
}

exports.WechatPayment = WechatPayment
