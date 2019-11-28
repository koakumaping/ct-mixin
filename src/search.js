import store from 'store'

export default {
  data() {
    return {
      searchForm: {},
    }
  },
  computed: {
    searchQuery() {
      const _query = this._.queryClone(this.$route.query)
      delete _query.t
      _query.t = +new Date()
      _query.currentpage = 1
      if (!this._.hasOwn(_query, 'pagesize')) _query.pagesize = store.get('perPage') || 10
      // 还原当前页码
      if (this.$route.query.page) {
        _query.currentpage = this.$route.query.page
      }
      this.numberObject(_query)
      return _query
    },
    urlQuery() {
      return this._.queryClone(this.$route.query)
    },
    appkey() {
      return window.sessionStorage.getItem('token')
    },
  },
  created() {
    this.restoreSearch()
  },
  methods: {
    // 字符型数字转数字
    numberObject(object) {
      for (const key in object) {
        if (this._.hasOwn(object, key) && this._.isNumber(object[key])) {
          object[key] = Number(object[key])
        }
      }
    },
    numberArray(arr = []) {
      for (let i = 0, l = arr.length; i < l; ++i) {
        if (this._.isNumber(arr[i])) arr[i] = Number(arr[i])
      }
    },
    // query中带上不需要重置的参数
    clearSearch(query = {}) {
      const searchQuery = this._.queryClone(query)
      // 保证t在末尾
      delete searchQuery.t
      delete searchQuery.page
      searchQuery.t = +new Date()
      this.$router.push({ name: this.$route.name, query: searchQuery })
    },
    restoreSearch(query = this.searchForm) {
      const searchQuery = this._.queryClone(this.$route.query)
      for (const key in searchQuery) {
        if (
          searchQuery[key]
          && this._.isString(searchQuery[key])
          && searchQuery[key].indexOf(',') > -1
          && searchQuery[key].charAt(searchQuery[key].length - 1) === ','
        ) {
          searchQuery[key] = searchQuery[key].split(',')
          // 去除空值
          searchQuery[key] = searchQuery[key].filter(item => item !== undefined && item !== null && item !== '')
          this.numberArray(searchQuery[key])
        }
        if (this._.isNumber(searchQuery[key])) {
          searchQuery[key] = Number(searchQuery[key])
        }
      }
      delete searchQuery.p
      Object.assign(query, searchQuery)
      this.numberObject(query)
    },
    doSearch(replace = false) {
      const query = this.searchForm
      const searchQuery = this._.queryClone(query)
      // 防止Boolean作为get参数时变成String
      for (const key in searchQuery) {
        if (this._.isBoolean(searchQuery[key])) {
          searchQuery[key] = this._.toNumber(searchQuery[key])
        }
      }
      // 保证t在末尾
      delete searchQuery.t
      delete searchQuery.page
      searchQuery.t = +new Date()

      // 删除选择项
      store.set(`${this.$options.name}__selection`, [])
      if (replace) {
        this.$router.replace({ name: this.$route.name, query: searchQuery })
      } else {
        this.$router.push({ name: this.$route.name, query: searchQuery })
      }
    },
    doOutput() {
      const query = this.searchForm
      const searchQuery = this._.queryClone(query)
      const url = '/ctoa/crmsys/CustomerFollowUpAction?appkey='
      const appkey = window.sessionStorage.getItem('token')
      const paramStr = window.encodeURI(this.toQueryString(searchQuery), 'UTF-8')

      return window.open(`${url}${appkey}&action=1&${paramStr}`)
    },
    toQueryString(obj) {
      let ret = []
      for (let key in obj) {
        key = encodeURIComponent(key)
        const values = obj[key]
        if (values && values.constructor === Array) {
          const queryValues = []
          for (let i = 0, len = values.length, value; i < len; i++) {
            value = values[i]
            queryValues.push(this.toQueryPair(key, value))
          }
          ret = ret.concat(queryValues)
        } else {
          ret.push(this.toQueryPair(key, values))
        }
      }
      return ret.join('&')
    },
    toQueryPair(key, value) {
      if (typeof value === 'undefined') {
        return key + '=""'
      }
      return key + '=' + encodeURIComponent(value === null ? '' : String(value))
    },
    reload() {
      this.$router.replace({ name: this.$route.name, query: this.requestQuery() })
    },
    requestQuery(customQuery = {}) {
      const _query = Object.assign({}, this.searchForm, this.urlQuery, customQuery)
      for (const key in _query) {
        const str = _query[key]
        if (str && this._.isString(str)) {
          // 删除原先数组加在最后的逗号
          if (str.charAt(str.length - 1) === ',') {
            _query[key] = _query[key].substring(0, _query[key].length - 1)
          }
        }
        if (this._.isArray(str)) {
          _query[key] = _query[key].toString()
        }
        if (this._.isBoolean(str)) {
          _query[key] = this._.toNumber(_query[key])
        }
        // 删除为空的
        if (this._.isEmpty(str) || str === ',') {
          delete _query[key]
        }
      }
      // 保证t在末尾
      delete _query.t
      _query.t = +new Date()
      _query.currentpage = 1
      _query.pagesize = _query.pagesize || store.get('perPage') || 10
      // 还原当前页码
      if (this.$route.query.page) {
        _query.currentpage = this.$route.query.page
      }
      return _query
    },
  },
}