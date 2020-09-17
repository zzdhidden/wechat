const { WechatPayment } = require('../')
const mchId = process.env.WECHAT_PAYMENT_MCH_ID || '1501176891'
const apiKey = process.env.WECHAT_PAYMENT_API_KEY || 'test'

describe('wechat payment', () => {
  test('static method', async () => {
    const xml = `
    <xml>
      <mch_id><![CDATA[1501176891]]></mch_id>
      <nonce_str><![CDATA[hcO393vP5pPYRj8py35ray29pytYYodq]]></nonce_str>
      <sign><![CDATA[06EAEE0200EC0D1A8D24BB14FE51B3EF]]></sign>
    </xml>
    `
    const data = WechatPayment.parseXML(xml)
    const sign = WechatPayment.sign(data, 'abc')
    expect(sign).toBe(data.sign)
  })

  test('post test', async () => {
    const api = new WechatPayment(
      {
        mch_id: mchId,
      },
      { apiKey, sandbox: true }
    )
    const res = await api.post('pay/getsignkey')
    api.$config.apiKey = res.sandbox_signkey
    expect(res.sandbox_signkey).toBeDefined()
  })
})