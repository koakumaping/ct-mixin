import store from 'store'
import emitter from './emitter'
import search from './search'
import upload from './upload'
import user from './user'
import responseMixins from './response'
import systemMixins from './system'

export default {
  mixins: [
    emitter,
    responseMixins,
    search,
    upload,
    user,
    systemMixins,
  ],
  data() {
    return {
      visible: false,
      loading: false,
      tableName: 'tableList',
      modularRouterName: '',
      appid: '',
      sysid: '',
      dd: {},
      list: [],
      cols: [],
      colConfig: [],
      selectionList: [],
      sideList: [],
      total: 0,
      template: {},
      rowKey: 'Id',
      editId: '',
      rowForm: {},
      dynamic: {
        data: [],
        cols: [],
        formatter: this.formatter,
        defaultSort: {
          prop: '',
          order: '',
        },
      },
    }
  },
  computed: {
    routerName() {
      return this.$options.name
    },
    storeName() {
      return `${this.routerName}__selection`
    },
    hasHideCols() {
      return this.cols.some(element => element.canhide)
    },
    hasSelectedRows() {
      return this.selectionList.length > 0 ||
        this.storeRows.length > 0
    },
    storeRows: {
      cache: false,
      get(val) {
        return store.get(this.storeName) || []
      },
    },
    tableHeight() {
      return this._.getWindowHeight() - 180
    },
    // 带翻页
    tableListHeight() {
      return this._.getWindowHeight() - 224
    },
  },
  created() {
    this.restoreCols()
    this.restorePermission()
    this.restoreList()
  },
  methods: {
    showLoading() {
      const listWarp = this.findComponentDownward(this, 'listWarp')
      if (listWarp) listWarp.showSpin()
    },
    hideLoading() {
      try {
        this.findComponentDownward(this, 'listWarp').hideSpin()
      } catch (error) {
        (() => {})()
      }
    },
    getList() {
      this.showLoading()
      return new Promise((resolve, reject) => {
        this.r().get(this.routerName, { params: this.requestQuery() }).then(response => {
          this.handleResults(response)
          this.dynamic.data = this.list
          this.dynamic.cols = this.cols
          this.$nextTick(() => {
            this.saveList()
            this.savePermission()
            this.restoreSelection()
          })
          resolve(response)
          this.hideLoading()
        }).catch(error => {
          this.hideLoading()
          reject(error)
        })
      })
    },
    getNormalList() {
      this.showLoading()

      return new Promise((resolve, reject) => {
        this.r().get(this.routerName, { params: this.requestQuery() }).then(response => {
          const data = this.getData(response.data)
          if (data) {
            this.list = data.rows
            this.total = data.records
            this.p.readonly = !!data.readonly
          }
          this.$nextTick(() => {
            this.saveList()
            this.savePermission()
            this.restoreSelection()
          })
          this.hideLoading()
          resolve(response)
        }).catch(error => {
          this.hideLoading()
          reject(error)
        })
      })
    },
    handleResults(payload) {
      if (!payload.data) return false
      const _payload = this._.clone(payload)
      this.dd = this._.clone(this.getData(_payload.data))
      this.template = this.handleTemplate(payload.datatemplate)
      this.handleDictionaries(payload.dictionaries)
      this.handleAttachmentList(payload.attachment)
      this.handleCols(_payload.collist)
      const _data = this.getData(_payload.data, true)
      this.handlePermission(this.dd)
      this.p.readonly = !!_data.readonly
      this.list = _data.rows
      this.total = this.dd.records
      return _data
    },
    handleCols(payload) {
      if (!payload) return false
      this.tableName = payload.name
      this.cols = this.cols.length === 0 ? payload.cols : this.cols
      this.sortCols()
      this.configCols()
      this.saveCols()
    },
    // 单行删除
    handleDelete(payload = this.selectionList) {
      const idList = payload.toString()
      console.log('dd', idList)
      if (!idList) {
        console.warn('handleDelete need idList')
        return false
      }
      let appId
      let sysId
      const menuList = store.get('menu')
      menuList.forEach((block) => {
        const sys = block.platform
        block.children.forEach((line) => {
          line.children.forEach((item) => {
            if (this.routerName === item.routerName) {
              appId = item.appid
              sysId = sys
            }
          })
        })
      })

      const params = {
        appid: appId,
        id: idList,
        sys: sysId,
      }

      console.log('listDelete', params)

      this.r().delete('listDelete', { params }).then(response => {
        this.$notice.success({
          title: '提示',
          content: '操作成功',
        })
        this.clearSelection()
        this.reload()
      }).catch(error => {
        this.reload()
      })
    },
    // crm对账删除
    handleCheckDelete(payload = this.selectionList) {
      const idList = payload.toString()
      console.log('dd', idList)
      if (!idList) {
        console.warn('handleDelete need idList')
        return false
      }
      let appId
      let sysId
      const menuList = store.get('menu')
      menuList.forEach((block) => {
        const sys = block.platform
        block.children.forEach((line) => {
          line.children.forEach((item) => {
            if (this.routerName === item.routerName) {
              appId = item.appid
              sysId = sys
            }
          })
        })
      })

      const params = {
        appid: appId,
        id: idList,
        sys: sysId,
      }

      console.log('crmDebitOnlineToDoDelete', params)

      this.r().delete('crmDebitOnlineToDoDelete', { params }).then(response => {
        this.$notice.success({
          title: '提示',
          content: '操作成功',
        })
        this.clearSelection()
        this.reload()
      }).catch(error => {
        this.reload()
      })
    },
    // 批量操作
    handleBatch(options = {}, routerName = this.routerName) {
      const formdata = {
        id: this.selectionList.toString(),
      }

      Object.assign(formdata, options)
      this.r().post(routerName, formdata).then(() => {
        this.$notice.success({
          title: '提示',
          content: '操作成功',
        })
        this.clearSelection()
        this.reload()
      })
    },
    sortCols() {
      const { sortname, sortorder } = this.searchForm

      const defaultSort = {
        prop: sortname || '',
        order: '',
      }

      if (sortorder === 1) defaultSort.order = 'ascending'
      if (sortorder === 2) defaultSort.order = 'descending'

      this.cols.sort((a, b) => this._.toNumber(a.sort) - this._.toNumber(b.sort))
      // 保证有一定的顺序, 主动排序一次
      this.cols.forEach((element, index) => {
        element.key = this._.randomString(12, true)
        element.sort = index
        element.minWidth = element.width || 120
        if (!defaultSort.order && element.datasort) {
          defaultSort.prop = element.prop
          if (element.datasort === 1) defaultSort.order = 'ascending'
          if (element.datasort === 2) defaultSort.order = 'descending'
        }
      })

      this.dynamic.defaultSort = defaultSort
    },
    // 自定义cols中的一些参数
    configCols() {
      this.cols.forEach((element, index) => {
        const config =
          this._.hasOwn(this.colConfig, element.prop) ?
            this.colConfig[element.prop]
            :
            {}
        Object.assign(element, config)
      })
    },
    saveList() {
      store.set(this.$route.name, this.list)
    },
    saveCols() {
      store.set(`${this.$route.name}Cols`, this.cols)
    },
    savePermission() {
      store.set(`${this.$route.name}Permission`, this.p)
    },
    doSaveStroage() {
      this.saveList()
      this.saveCols()
      this.savePermission()
    },
    saveColsToServer(reset = false) {
      if (this.cols.length === 0) {
        this.$notice.error({
          title: '错误',
          content: '数据异常',
        })
        return false
      }

      const cols = this.cols.map((item) => {
        for (const key in item) {
          if (this._.isBoolean(item[key])) {
            item[key] = !reset ? this._.toNumber(item[key]) : 1
          }
        }
        return item
      })

      const formdata = {
        cols: cols,
        name: this.tableName,
      }

      this.r().post('saveTableCols', formdata).then(() => {
        this.cols = cols
        this.saveCols()
        this.sortCols()
        this.reload()
      })
    },
    restoreList() {
      if (store.get(this.$route.name)) {
        this.list = store.get(this.$route.name) || []
        this.dynamic.data = this.list
      }
    },
    restoreCols() {
      const name = `${this.$route.name}Cols`
      const data = store.get(name)
      if (data) {
        this.cols = data || []
        this.dynamic.cols = this.cols
      }
    },
    restorePermission() {
      // if (store.get(`${this.$route.name}Permission`)) {
      //   this.p = store.get(`${this.$route.name}Permission`) || { readonly: 0 }
      // }
      const name = `${this.$route.name}Permission`
      const data = store.get(name)
      if (data) {
        this.p = data || { readonly: 0 }
      }
    },
    restoreSelection() {
      const data = store.get(this.storeName) || []
      this.selectionList = data

      const selectionList = []
      data.forEach((itemId) => {
        this.list.forEach((item, index) => {
          const id = item[this.rowKey]
          if (itemId === id) selectionList.push(this.list[index])
        })
      })
      this.toggleSelection(selectionList)
    },
    toggleSelection(rows) {
      const table = this.$refs.tableList || this.findComponentDownward(this, 'ctTable')
      if (rows) {
        rows.forEach(row => {
          table.toggleRowSelection(row)
        })
      } else {
        table.clearSelection()
      }
    },
    selectionChange(payload) {
      // 传入的
      const idList = payload.map((item) => item[this.rowKey])
      // 已经存储的
      const stroageList = store.get(this.storeName) || []
      // 要移除的， 只做测试显示用
      const removeList = []
      // console.log('stroageList', stroageList)
      // 遍历传入的。跟当前list的做对比
      this.list.forEach((item) => {
        const id = item[this.rowKey]
        // 如果传入的列表中没有，但是已经存储的中是存在的，说明要做移除
        if (idList.indexOf(id) === -1 && stroageList.indexOf(id) > -1) {
          removeList.push(id)
          stroageList.splice(stroageList.indexOf(id), 1)
        }
      })
      // console.log('idList', idList)
      // console.log('removeList', removeList)
      // console.log('stroageList', stroageList)
      const list = this._.unique(idList.concat(stroageList))
      store.set(this.storeName, list)
      this.selectionList = list
      // console.log('stroageList-all', store.get(this.storeName) || [])
    },
    clearSelection() {
      this.selectionList = []
      store.set(this.storeName, [])
    },
    up(index) {
      console.log(this.cols[index])
      if (index === 0) return false
      const item = this.cols[index]
      const itemUp = this.cols[index - 1]
      item.sort --
      itemUp.sort ++
      this.sortCols()
    },
    down(index) {
      console.log(this.cols[index])
      if (index === this.cols.length) return false
      const item = this.cols[index]
      const itemDown = this.cols[index + 1]
      item.sort ++
      itemDown.sort --
      this.sortCols()
    },
    getGlobalList(name = '', options = {}, callback = () => {}) {
      if (!name || this._.isEmptyObject(options)) {
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
        this.r().post('globalSearch', formdata).then(response => {
          callback(response.Rows)
          resolve(response.Rows)
        })
      })
    },
    // 显示弹窗
    showRowForm(formName, row = {}) {
      if (!formName) {
        console.warn('showRowForm need formName')
        return false``
      }
      this.rowForm = this._.clone(row)
      this.$refs[formName].show()
    },
    // 隐藏子表弹窗
    hideRowForm(formName) {
      if (!formName) {
        console.warn('hideRowForm need formName')
        return false
      }
      this.$refs[formName].hide()
    },
    // 获取特定自定义属性的数值
    getValueFromJsonList(payload, key) {
      for (const i in payload) {
        if (payload[i].key === key) return payload[i].value
      }
      return '--'
    },
    handleTodoDelete(row) {
      const params = {
        appid: row.appid,
        id: row.Id,
        sys: row.sys,
      }
      this.r().delete('/ctoa/plat/oaplattask', { params }).then(respones => {
        this.$notice.success({
          title: '提示',
          content: '操作成功',
        })
        this.clearSelection()
        this.reload()
      })
    },
  },
  beforeRouteUpdate(to, from, next) {
    this.doSaveStroage()
    next()
  },
  beforeRouteLeave(to, from, next) {
    this.clearSelection()
    this.doSaveStroage()
    next()
  },
}