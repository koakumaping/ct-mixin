import store from 'store'
import { formatDictionaries } from 'ct-util'

function walkDict(dictName = '', cellValue = '', arr = {}, dict = {}) {
  arr = Object.keys(arr)
  for (let i = 0, l = arr.length; i < l; ++i) {
    for (let k = 0, t = arr[i].length; k < t; ++k) {
      const dictTemp = Object.assign({}, dict[dictName][arr[i]][k])
      if (dictTemp.value === cellValue) {
        return dictTemp.label
      }
    }
  }
  return '--'
}

export default {
  name: 'dictMixin',
  data() {
    return {
      dictionaries: store.get('dictionaries') || {},
    }
  },
  // computed: {
  //   dictionaries: {
  //     cache: false,
  //     get() {
  //       return store.get('dictionaries') || {}
  //     },
  //   },
  // },
  methods: {
    getExtraDict(routerName, options = {}) {
      return new Promise((resolve, reject) => {
        const params = {}
        Object.assign(params, options)

        this.r().get(routerName, { params }).then(response => {
          resolve(formatDictionaries(response.dictionaries))
        })
      })
    },
    formatter(dictName, cellValue) {
      let arr = this.dictionaries[dictName] || []
      if (arr.length === 0) {
        arr = store.get(dictName) ? store.get(dictName)[dictName] : []
      }
      if (dictName === 'county' || dictName === 'city' && cellValue !== '') {
        cellValue = walkDict(dictName, cellValue, arr, this.dictionaries)
      } else {
        for (let i = 0, l = arr.length; i < l; ++i) {
          if (this._.toNumber(arr[i].value) === cellValue) {
            return arr[i].label
          }
        }
      }
      return cellValue ? cellValue.toString() ? cellValue : '--' : '--'
    },
    getDictionaries() {
      return new Promise((resolve, reject) => {
        const params = {
          model: 'Global',
        }

        this.r().get('dictionariesList', { params }).then(response => {
          store.set('dictionaries', formatDictionaries(response.dictionaries))
          resolve(response)
        }).catch(error => {
          reject(error)
        })
      })
    },
    // 处理原始字典表，转换成前端可以使用的
    handleDictionaries(dictionaries = []) {
      const dict = this._.clone(this.dictionaries)
      try {
        const newDict = Object.assign(dict, formatDictionaries(dictionaries))
        this.dictionaries = newDict
        store.set('dictionaries', newDict)
      } catch (error) {
        console.log(error)
      }
    },
  },
}