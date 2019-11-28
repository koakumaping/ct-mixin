import {
  isArray,
  toNumber,
  isNumber,
  formatResponse,
} from 'ct-util'
import permissionMixins from './permission'
import dictMixins from './dict'

export default {
  mixins: [
    permissionMixins,
    dictMixins,
  ],
  methods: {
    getData(payload, handleData = false) {
      for (const key in payload) {
        if (handleData) this.handleData(payload[key])
        return payload[key]
      }
    },
    handleData(payload) {
      for (const key in payload) {
        if (isNumber(payload[key])) {
          payload[key] = toNumber(payload[key])
        } else if (isArray(payload[key])) {
          payload[key] = formatResponse(payload[key], true)
        }
      }
    },
    // 处理默认模板
    handleTemplate(payload) {
      const obj = this.arrayToObject(payload)
      const template = {}
      for (const key in obj) {
        if (obj[key].value) {
          template[key] = formatResponse(obj[key].value.rows, true)[0]
        } else {
          template[key] = obj[key]
        }
      }
      return template
    },
    arrayToObject(arr = []) {
      const l = arr.length
      const obj = {}
      for (let i = 0; i < l; ++i) {
        const child = arr[i]
        for (const key in child) {
          obj[key.toString()] = child[key]
        }
      }

      return obj
    },
    // 检查form表单规制
    async formCheckError(formName) {
      let pass
      await this.$refs[formName].validate().then((valid) => {
        pass = valid
      }).catch((valid) => {
        this.$notice.error({
          title: '验证失败',
          content: '请检查填写内容',
        })
        pass = valid
      })
      return pass
    },
    // 导出文件
    outputExcelUrl(base, query = {}) {
      let params = this.requestQuery()
      params = Object.assign(params, query)
      params.appkey = window.sessionStorage.getItem('token')
      params = this._.object2params(params)
      if (base.indexOf('?', 0) !== -1) params = params.replace('?', '&')
      window.open(`http://${window.location.host}${base}${params}`)
    },
  },
}