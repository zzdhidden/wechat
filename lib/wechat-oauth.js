const querystring = require('querystring')
const Base = require('./base')

class WechatOauth extends Base {
  /**
   * Wechat oauth2
   *
   * @param {Object} params
   * 	- appid
   * 	- secret
   *
   */
  constructor(params, config) {
    super(params, config, 'https://api.weixin.qq.com/sns/')
  }

  /**
   * Get access token.
   * Notice: It will not call `saveAccessToken` api.
   *
   * @api public
   * @param {Object} params request params
   *
   */

  getAccessToken(...params) {
    params = Object.assign(
      { grant_type: 'authorization_code' },
      this.composeParams(['!code', '!appid', '!secret', 'grant_type'], params)
    )
    return this.request('oauth2/access_token', { params }).then(data => {
      // access_token, expires_in, refresh_token, openid, scope
      this.accessToken = Object.assign(
        {
          created_at: Date.now()
        },
        data
      )
      return this.accessToken
    })
  }

  /**
   * Get autherize url.
   */
  getAuthorizeURL(params) {
    params = Object.assign(
      {
        appid: this.$params.appid,
        redirect_uri: this.$params.redirect_uri || '',
        response_type: this.$params.response_type || 'code',
        scope: this.$params.scope || 'snsapi_base',
        state: this.$params.state || 'state'
      },
      params
    )

    return (
      'https://open.weixin.qq.com/connect/oauth2/authorize' +
      '?' +
      querystring.stringify(params) +
      '#wechat_redirect'
    )
  }

  /**
   * Get web qr scan autherize url.
   */
  getQRAuthorizeURL(params) {
    params = Object.assign(
      {
        appid: this.$params.appid,
        redirect_uri: this.$params.redirect_uri || '',
        response_type: this.$params.response_type || 'code',
        scope: this.$params.scope || 'snsapi_login',
        state: this.$params.state || 'state'
      },
      params
    )

    return 'https://open.weixin.qq.com/connect/qrconnect' + '?' + querystring.stringify(params)
  }
}

WechatOauth.shortcuts = {
  getUserInfo: ['get', 'userinfo', ['!openid', 'lang']]
}

module.exports = WechatOauth