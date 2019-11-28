import validatorMixins from './validator'
import dictMixins from './dict'

export default {
  mixins: [validatorMixins, dictMixins],
  props: {
    childForm: Object,
    // 判断是编辑还是新增
    edit: Boolean,
    p: {
      type: Object,
      default: function d() {
        return {}
      },
    },
  },
  data() {
    return {
      loading: false,
      form: {},
    }
  },
  created() {
    this.form = this._.clone(this.childForm)
  },
  methods: {
    getData(payload, handleData = false) {
      for (const key in payload) {
        if (handleData) this.handleData(payload[key])
        return payload[key]
      }
    },
    handleData(payload) {
      for (const key in payload) {
        if (this._.isNumber(payload[key])) {
          payload[key] = this._.toNumber(payload[key])
        } else if (this._.isArray(payload[key])) {
          payload[key] = this._.formatResponse(payload[key])
        }
      }
    },
    handleSave() {
      this.loading = false
      return false
    },
    save() {
      this.loading = true
      let pass = false
      this.$refs.form.validate((valid) => {
        if (valid) {
          pass = true
        } else {
          this.$notice.error({
            title: '提交失败',
            content: '请检查填写的数据',
          })
          this.loading = false
          return false
        }
      })

      if (pass) {
        if (this.handleSave()) return false
        this.loading = false
        this.$emit('on-save', {
          form: this._.clone(this.form),
          edit: this.edit,
        })
      }
    },
    getP(name, pName) {
      if (this._.hasOwn(this.p, name)) {
        if (pName === 'readonly') return !this.p[name][pName]
        return pName ? this.p[name][pName] : this.p[name]
      }
    },
    // 获取权限
    P(name) {
      const permission = this.getValueByPath(this.p, name)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 readonly
    R(name) {
      if (!name) return this.p.readonly
      const permission = this.getValueByPath(this.p, `${name}.readonly`)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 visible
    V(name) {
      if (!name) return this.p.readonly
      const permission = this.getValueByPath(this.p, `${name}.visible`)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 candel
    D(name) {
      if (!name) return this.p.readonly
      const permission = this.getValueByPath(this.p, `${name}.candel`)
      // console.log(name, permission)
      return permission
    },
    getValueByPath(object, prop) {
      prop = prop || ''
      const paths = prop.split('.')
      let current = object
      let result = null
      for (let i = 0, j = paths.length; i < j; i++) {
        const path = paths[i]
        if (!current) break

        if (i === j - 1) {
          result = current[path]
          break
        }
        current = current[path]
      }
      return result
    },
    formatter(dictName, cellValue) {
      // console.log(dictName, cellValue)
      const arr = this.dictionaries[dictName] || []
      for (let i = 0, l = arr.length; i < l; ++i) {
        if (this._.toNumber(arr[i].value) === cellValue) {
          return arr[i].label
        }
      }
      return cellValue ? cellValue.toString() ? cellValue : '--' : '--'
    },
    getPeopleGlobalList(name = '', options = {}) {
      if (!name || this._.isEmptyObject(options)) {
        console.warn('getPeopleGlobalList need name or option')
        return false
      }

      const formdata = {
        key: name,
        pagesize: 20,
        pageindex: 1,
        allowpageing: 0,
        querymodel: options,
      }

      return new Promise((resolve, reject) => {
        this.r().post('peopleSearch', formdata).then(response => {
          resolve(response.Rows)
        })
      })
    },
  },
}